const { Discord, Client, MessageEmbed } = require('discord.js');
const client = global.client = new Client({fetchAllMembers: true});
const ayarlar = require('./ayarlar.json');
const fs = require('fs');
//Durum
client.on("ready", async () => {
  client.user.setPresence({ activity: { name: "Milli İstihbarat Teşkilatı Koruyor" }, status: "online" });
  let botVoiceChannel = client.channels.cache.get(ayarlar.botVoiceChannelID);
  if (botVoiceChannel) botVoiceChannel.join().catch(err => console.error("Bot ses kanalına bağlanamadı!"));
});
//Başlarken
client.on("message", async message => {
  if (message.author.bot || !message.guild || !message.content.toLowerCase().startsWith(ayarlar.botPrefix)) return;
  if (message.author.id !== ayarlar.botOwner && message.author.id !== message.guild.owner.id) return;
  let args = message.content.split(' ').slice(1);
  let command = message.content.split(' ')[0].slice(ayarlar.botPrefix.length);
  let embed = new MessageEmbed().setColor("#00ffdd").setAuthor(message.member.displayName, message.author.avatarURL({ dynamic: true, })).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "Yashinu"}`).setTimestamp();


// Güvenliye ekleme fonksiyonu
  if(command === "güvenli") {
    let hedef;
    let rol = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name === args.join(" "));
    let uye = message.mentions.users.first() || message.guild.members.cache.get(args[0]);
    if (rol) hedef = rol;
    if (uye) hedef = uye;
    let guvenliler = ayarlar.whitelist || [];
    if (!hedef) return message.channel.send(embed.setDescription(`Güvenli listeye eklemek/kaldırmak için bir (rol/üye) belirtmelisin!`).addField("Güvenli Liste", guvenliler.length > 0 ? guvenliler.map(g => (message.guild.roles.cache.has(g.slice(1)) || message.guild.members.cache.has(g.slice(1))) ? (message.guild.roles.cache.get(g.slice(1)) || message.guild.members.cache.get(g.slice(1))) : g).join('\n') : "Bulunamadı!"));
    if (guvenliler.some(g => g.includes(hedef.id))) {
      guvenliler = guvenliler.filter(g => !g.includes(hedef.id));
      ayarlar.whitelist = guvenliler;
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeden kaldırıldı!`));
    } else {
      ayarlar.whitelist.push(`y${hedef.id}`);
      fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
        if (err) console.log(err);
      });
      message.channel.send(embed.setDescription(`${hedef}, ${message.author} tarafından güvenli listeye eklendi!`));
    };
  };
  // Koruma açma kapama
  if(command === "koruma")  {
    let korumalar = Object.keys(ayarlar).filter(k => k.includes('Guard'));
    if (!args[0] || !korumalar.some(k => k.includes(args[0]))) return message.channel.send(embed.setDescription(`Korumaları aktif etmek veya devre dışı bırakmak için **${ayarlar.botPrefix}koruma <tür>** yazmanız yeterlidir! **Korumalar:** ${korumalar.map(k => `\`${k}\``).join(', ')}\n**Aktif Korumalar:** ${korumalar.filter(k => ayarlar[k]).map(k => `\`${k}\``).join(', ')}`));
    let koruma = korumalar.find(k => k.includes(args[0]));
    ayarlar[koruma] = !ayarlar[koruma];
    fs.writeFile("./ayarlar.json", JSON.stringify(ayarlar), (err) => {
      if (err) console.log(err);
    });
    message.channel.send(embed.setDescription(`**${koruma}** koruması, ${message.author} tarafından ${ayarlar[koruma] ? "aktif edildi" : "devre dışı bırakıldı"}!`));
  };
});
// Güvenli tanım fonksiyonu
function guvenli(kisiID) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  let guvenliler = ayarlar.whitelist || [];
  if (!uye || uye.id === client.user.id || uye.id === ayarlar.botOwner || uye.id === uye.guild.owner.id || guvenliler.some(g => uye.id === g.slice(1) || uye.roles.cache.has(g.slice(1)))) return true
  else return false;
};
//Cezaladırma fonksiyonu
const yetkiPermleri = ["ADMINISTRATOR", "MANAGE_ROLES", "MANAGE_CHANNELS", "MANAGE_GUILD", "BAN_MEMBERS", "KICK_MEMBERS", "MANAGE_NICKNAMES", "MANAGE_EMOJIS", "MANAGE_WEBHOOKS"];
function cezalandir(kisiID, tur) {
  let uye = client.guilds.cache.get(ayarlar.guildID).members.cache.get(kisiID);
  if (!uye) return;
  if (tur == "jail") return uye.roles.cache.has(ayarlar.boosterRole) ? uye.roles.set([ayarlar.boosterRole, ayarlar.jailRole]) : uye.roles.set([ayarlar.jailRole]);
  if (tur == "ban") return uye.ban({ reason: "KORUMA" }).catch();
};
// Kick koruması
client.on("guildMemberRemove", async member => {
  let entry = await member.guild.fetchAuditLogs({type: 'MEMBER_KICK'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.kickGuard) return;
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#00ffdd")
  .setTitle('Sağ Tık İle Kullanıcı Kicklendi!')
  .setDescription(`
    **Kicklenen Kullanıcı:** ${member} • **${member.id}**
    **Kickleyen Kullanıcı:** ${entry.executor} **(${entry.executor.id})**
    ***Sağ tık ile kickleyen kullanıcı uzaklaştırıldı.***`)
    .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
    .setThumbnail(`${entry.executor.displayAvatarURL()}`)
  .setTimestamp()).catch(); } else { member.guild.owner.send(new MessageEmbed()
    .setColor("#00ffdd")
    .setTitle('Sağ Tık İle Kullanıcı Kicklendi!')
    .setDescription(`
      **Kicklenen Kullanıcı:** ${user} • **${user.id}**
      **Kickleyen Kullanıcı:** ${entry.executor} **(${entry.executor.id})**
      ***Sağ tık ile kickleyen kullanıcı uzaklaştırıldı.***`)
      .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
      .setThumbnail(`${entry.executor.displayAvatarURL()}`)
    .setTimestamp()).catch(err => {}); };
});
// Ban koruması
client.on("guildBanAdd", async (guild, user) => {
  let entry = await guild.fetchAuditLogs({type: 'MEMBER_BAN_ADD'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || guvenli(entry.executor.id) || !ayarlar.banGuard) return;
   cezalandir(entry.executor.id, "jail");
  guild.members.unban(user.id, "Sağ Tık İle Yasaklandığı İçin Geri Açıldı!").catch(console.error);
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed()
    .setColor("#00ffdd").setTitle('Sağ Tık İle Kullanıcı Yasaklandı!')
    .setDescription(`
      **Yasaklanan Kullanıcı:** ${user} • **${user.id}**
      **Yasaklayan Kullanıcı:** ${entry.executor} **(${entry.executor.id})**
      ***Yasaklanan kullanıcının yasağı açıldı ve yasaklayan kullanıcı uzaklaştırıldı.***`)
      .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
      .setThumbnail(`${entry.executor.displayAvatarURL()}`)
    .setTimestamp()).catch(); } else { guild.owner.send(new MessageEmbed()
    .setColor("#00ffdd")
    .setTitle('Sağ Tık İle Kullanıcı Yasaklandı!')
    .setDescription(`
      **Yasaklanan Kullanıcı:** ${user} • **${user.id}**
      **Yasaklayan Kullanıcı:** ${entry.executor} **(${entry.executor.id})**
      ***Yasaklanan kullanıcının yasağı açıldı ve yasaklayan kullanıcı uzaklaştırıldı.***`)
      .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
      .setThumbnail(`${entry.executor.displayAvatarURL()}`)
    .setTimestamp()).catch(err => {}); };
});
// Bot koruması
client.on("guildMemberAdd", async member => {
  let entry = await member.guild.fetchAuditLogs({type: 'BOT_ADD'}).then(audit => audit.entries.first());
  if (!member.user.bot || !entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.botGuard) return;
  cezalandir(entry.executor.id, "ban");
  cezalandir(member.id, "ban");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#00ffdd")
  .setTitle('Sunucuya Bot Eklendi!')
  .setDescription(`
    **Eklenen Bot:** ${member} • ${member.id}
    **Ekleyen Kullanıcı:** ${entry.executor} • ${entry.executor.id}
    ***Botu ekleyen kullanıcı ve bot sunucudan banlandı.***`)
    .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
    .setThumbnail(`${entry.executor.displayAvatarURL()}`)
     .setTimestamp()).catch(); } else { member.guild.owner.send(new MessageEmbed().setColor("#00ffdd")
     .setTitle('Sunucuya Bot Eklendi!')
     .setDescription(`
       **Eklenen Bot:** ${member} • ${member.id}
       **Ekleyen Kullanıcı:** ${entry.executor} • ${entry.executor.id}
       ***Botu ekleyen kullanıcı ve bot sunucudan banlandı.***`)
       .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
       .setThumbnail(`${entry.executor.displayAvatarURL()}`)
     .setTimestamp()).catch(err => {}); };
});
// GuildUpdate - Sunucu ayarları koruması
client.on("guildUpdate", async (oldGuild, newGuild) => {
  let entry = await newGuild.fetchAuditLogs({type: 'GUILD_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.serverGuard) return;
  cezalandir(entry.executor.id, "jail");
  if (newGuild.name !== oldGuild.name) newGuild.setName(oldGuild.name);
  if (newGuild.iconURL({dynamic: true, size: 2048}) !== oldGuild.iconURL({dynamic: true, size: 2048})) newGuild.setIcon(oldGuild.iconURL({dynamic: true, size: 2048}));
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed()
    .setColor("#00ffdd")
    .setThumbnail(`${entry.executor.displayAvatarURL()}`)
    .setTitle('Sunucu Ayarları Değiştirildi!')
    .setDescription(
      `${entry.executor} • (${entry.executor.id}) tarafından sunucu ayarları değiştirildi!

      ***Ayarları değiştiren kullanıcı uzaklaştırıldı ve sunucu eski haline getirildi.`)
      .setFooter(`${client.users.cache.get(ayarlar.botOwner)}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
      .setTimestamp()).catch(); } else { newGuild.owner.send(new MessageEmbed()
        .setThumbnail(`${entry.executor.displayAvatarURL()}`)
        .setColor("#00ffdd").setTitle('Sunucu Ayarları Değiştirildi!')
        .setDescription(`${entry.executor} • (${entry.executor.id}) tarafından sunucu ayarları değiştirildi!
      ***Ayarları değiştiren kullanıcı uzaklaştırıldı ve sunucu eski haline getirildi.`)
      .setFooter(`${client.users.cache.get(ayarlar.botOwner)}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
      .setTimestamp()).catch(err => {}); };
});
// Kanal açınca
client.on("channelCreate", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  channel.delete({reason: "Kanal Koruma"});
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed()  .setColor("#00ffdd")
    .setTitle('Kanal Oluşturuldu!')
    .setDescription(`
    **Oluşturulan Kanal:** ${(channel.name)} • ${(channel.id)}
    **Oluşturan Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

    ***Kanalı oluşturan kullanıcı uzaklaştırıldı ve kanal silindi.***`)
    .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
    .setThumbnail(`${entry.executor.displayAvatarURL()}`)
    .setTimestamp()).catch();} else{ channel.guild.owner.send(new MessageEmbed()
      .setColor("#00ffdd")
      .setTitle('Kanal Oluşturuldu!')
      .setDescription(`
      **Oluşturulan Kanal:** ${(channel.name)} • ${(channel.id)}
      **Oluşturan Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

      ***Kanalı oluşturan kullanıcı uzaklaştırıldı ve kanal silindi.***`)
      .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
      .setThumbnail(`${entry.executor.displayAvatarURL()}`).setTimestamp()).catch(err => {}); };
    });
// Kanal düzenleyince
client.on("channelUpdate", async (oldChannel, newChannel) => {
  let entry = await newChannel.guild.fetchAuditLogs({type: 'CHANNEL_UPDATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || !newChannel.guild.channels.cache.has(newChannel.id) || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  cezalandir(entry.executor.id, "jail");
  if (newChannel.type !== "category" && newChannel.parentID !== oldChannel.parentID) newChannel.setParent(oldChannel.parentID);
  if (newChannel.type === "category") {
    newChannel.edit({
      name: oldChannel.name,
    });
  } else if (newChannel.type === "text") {
    newChannel.edit({
      name: oldChannel.name,
      topic: oldChannel.topic,
      nsfw: oldChannel.nsfw,
      rateLimitPerUser: oldChannel.rateLimitPerUser
    });
  } else if (newChannel.type === "voice") {
    newChannel.edit({
      name: oldChannel.name,
      bitrate: oldChannel.bitrate,
      userLimit: oldChannel.userLimit,
    });
  };
  oldChannel.permissionOverwrites.forEach(perm => {
    let thisPermOverwrites = {};
    perm.allow.toArray().forEach(p => {
      thisPermOverwrites[p] = true;
    });
    perm.deny.toArray().forEach(p => {
      thisPermOverwrites[p] = false;
    });
    newChannel.createOverwrite(perm.id, thisPermOverwrites);
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed()
    .setColor("#00ffdd")
    .setTitle('Kanal Düzenlendi!')
    .setDescription(`
    **Düzenlenen Kanal:** ${(newChannel)} • ${(newChannel.id)}
    **Düzenleyen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

    ***Kanalı düzenleyen kullanıcı uzaklaştırıldı ve kanal eski haline getirildi.***`)
    .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
    .setThumbnail(`${entry.executor.displayAvatarURL()}`)
    .setTimestamp()).catch();} else{ channel.guild.owner.send(new MessageEmbed()
      .setColor("#00ffdd")
      .setTitle('Kanal Düzenlendi!')
      .setDescription(`
      **Düzenlenen Kanal:** ${(newChannel)} • ${(newChannel.id)}
      **Düzenleyen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

      ***Kanalı düzenleyen kullanıcı uzaklaştırıldı ve kanal eski haline getirildi.***`)
      .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
      .setThumbnail(`${entry.executor.displayAvatarURL()}`).setTimestamp()).catch(err => {}); };
    });
// Kanal silince
client.on("channelDelete", async channel => {
  let entry = await channel.guild.fetchAuditLogs({type: 'CHANNEL_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.channelGuard) return;
  cezalandir(entry.executor.id, "jail");
  await channel.clone({ reason: "Kanal Koruma" }).then(async kanal => {
    if (channel.parentID != null) await kanal.setParent(channel.parentID);
    await kanal.setPosition(channel.position);
    if (channel.type == "category") await channel.guild.channels.cache.filter(k => k.parentID == channel.id).forEach(x => x.setParent(kanal.id));
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed()
  .setColor("#00ffdd")
  .setTitle('Kanal Silindi!')
  .setDescription(`
  **Silinen Kanal:** ${(channel.name)} • ${(channel.id)}
  **Silen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

  ***Kanalı silen kullanıcı uzaklaştırıldı ve silinen kanal tekrar açıldı.***`)
  .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
  .setThumbnail(`${entry.executor.displayAvatarURL()}`)
  .setTimestamp()).catch();} else{ channel.guild.owner.send(new MessageEmbed()
    .setColor("#00ffdd")
    .setTitle('Kanal Silindi!')
    .setDescription(`
    **Silinen Kanal:** ${(channel.name)} • ${(channel.id)}
    **Silen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

    ***Kanalı silen kullanıcı uzaklaştırıldı ve silinen kanal tekrar açıldı.***`)
    .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
    .setThumbnail(`${entry.executor.displayAvatarURL()}`).setTimestamp()).catch(err => {}); };
  });
// Yt kapat fonksiyonu
function ytKapat(guildID) {
  let sunucu = client.guilds.cache.get(guildID);
  if (!sunucu) return;
  sunucu.roles.cache.filter(r => r.editable && (r.permissions.has("ADMINISTRATOR") || r.permissions.has("MANAGE_GUILD") || r.permissions.has("MANAGE_ROLES") || r.permissions.has("MANAGE_WEBHOOKS"))).forEach(async r => {
    await r.setPermissions(0);
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed().setColor("#00ffdd").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "Yashinu"} `).setTimestamp()).catch(); } else { channel.guild.owner.send(new MessageEmbed().setColor("#00ffdd").setTitle('İzinler Kapatıldı!').setDescription(`Rollerin yetkileri kapatıldı!`).setFooter(`${client.users.cache.has(ayarlar.botOwner) ? client.users.cache.get(ayarlar.botOwner).tag : "Yashinu"} `).setTimestamp()).catch(err => {}); };
};
//rol silince

client.on("roleDelete", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_DELETE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  cezalandir(entry.executor.id, "jail");
      role.guild.roles.create({
    name: role.name,
    color: role.hexColor,
    permissions: role.permissions
  });
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed()
.setColor("#00ffdd")
.setTitle('Rol Silindi!')
.setDescription(`
**Silinen Rol:** ${(role)} • ${(role.id)}
**Silen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

***Rolü silen kullanıcı uzaklaştırıldı ve silinen rol tekrar açıldı.***`)
.setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
.setThumbnail(`${entry.executor.displayAvatarURL()}`)
.setTimestamp()).catch();} else{ channel.guild.owner.send(new MessageEmbed()
  .setColor("#00ffdd")
  .setTitle('Rol Silindi!')
  .setDescription(`
  **Silinen Rol:** ${(role)} • ${(role.id)}
  **Silen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

  ***Rolü silen kullanıcı uzaklaştırıldı ve rol eski haline getirildi.***`)
  .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
  .setThumbnail(`${entry.executor.displayAvatarURL()}`).setTimestamp()).catch(err => {}); };
});
//rol açınca

client.on("roleCreate", async role => {
  let entry = await role.guild.fetchAuditLogs({type: 'ROLE_CREATE'}).then(audit => audit.entries.first());
  if (!entry || !entry.executor || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
  role.delete({reason: "Rol Koruma"});
  cezalandir(entry.executor.id, "jail");
  let logKanali = client.channels.cache.get(ayarlar.logChannelID);
  if (logKanali) { logKanali.send(new MessageEmbed()
.setColor("#00ffdd")
.setTitle('Rol Oluşturuldu!')
.setDescription(`
**Oluşturulan Rol:** ${(role.name)} • ${(role.id)}
**Oluşturan Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

***Rolü oluşturan kullanıcı uzaklaştırıldı ve rol silindi.***`)
.setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
.setThumbnail(`${entry.executor.displayAvatarURL()}`)
.setTimestamp()).catch();} else{ channel.guild.owner.send(new MessageEmbed()
  .setColor("#00ffdd")
  .setTitle('Rol Oluşturuldu!')
  .setDescription(`
  **Oluşturulan Rol:** ${(role.name)} • ${(role.id)}
  **Oluşturan Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

  ***Rolü oluşturan kullanıcı jaile atıldı ve rol silindi.***`)
  .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
  .setThumbnail(`${entry.executor.displayAvatarURL()}`)
  .setTimestamp()).catch(err => {}); };
});

//rol düzenleyince
client.on("roleUpdate", async(oldRole, newRole) => {
let entry = await newRole.guild.fetchAuditLogs({type: 'ROLE_UPDATE'}).then(audit => audit.entries.first());
if (!entry || !entry.executor || !newRole.guild.roles.cache.has(newRole.id) || Date.now()-entry.createdTimestamp > 5000 || guvenli(entry.executor.id) || !ayarlar.roleGuard) return;
cezalandir(entry.executor.id, "jail");
   newRole.setPermissions(oldRole.permissions)
    let logKanali = client.channels.cache.get(ayarlar.logChannelID);
    if (logKanali) {
          logKanali.send(new MessageEmbed()
        .setColor("#00ffdd")
        .setTitle('Rol Düzenlendi!')
        .setDescription(`
        **Düzenlenen Rol:** ${(newRole)} • ${(newRole.id)}
        **Düzenleyen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

        ***Rolü düzenleyen kullanıcı uzaklaştırıldı ve rol eski haline getirildi.***`)
        .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
        .setThumbnail(`${entry.executor.displayAvatarURL()}`)
        .setTimestamp()).catch();} else{channel.guild.owner.send(new MessageEmbed()
          .setColor("#00ffdd")
          .setTitle('Rol Düzenlendi!')
          .setDescription(`
          **Düzenlenen Rol:** ${(newRole)} • ${(newRole.id)}
          **Düzenleyen Kullanıcı:** ${entry.executor} ${entry.executor.tag} • ${entry.executor.id}

          ***Rolü düzenleyen kullanıcı uzaklaştırıldı ve rol eski haline getirildi.***`)
          .setFooter(`${client.users.cache.get(ayarlar.botOwner).tag}`,`${client.users.cache.get(ayarlar.botOwner).displayAvatarURL()}`)
          .setThumbnail(`${entry.executor.displayAvatarURL()}`)
          .setTimestamp()).catch(err => {}); };
        });

  /*DM
client.on("message", msg => {
var dm = client.users.cache.get(ayarlar.botOwner)
if(msg.channel.type === "dm") {
if(msg.author.id === client.user.id) return;
const emoji = client.emojis.cache.get("zil")
const botdm = new MessageEmbed()
.setTitle(":bell: Yeni Bir Mesaj Var :bell:")
.setTimestamp()
.setColor("RANDOM")
.setDescription(`**Gönderen Kullanıcı:** ${msg.author}
**Kullanıcı Adı ve ID:** ${msg.author.tag} • ${msg.author.id}
**Gönderilen Mesaj:** ${msg.content}`)
.setFooter(`${client.guilds.cache.get(ayarlar.guildID).name}`,`${client.guilds.cache.get(ayarlar.guildID).iconURL()}`)
dm.send(botdm)

}
if(msg.channel.bot) return;
});

.setThumbnail(`${msg.author.avatarURL()}`)*/
client.login(ayarlar.botToken).then(c => console.log(`${client.user.tag} olarak giriş yapıldı!`)).catch(err => console.error("Bota giriş yapılırken başarısız olundu!"));
