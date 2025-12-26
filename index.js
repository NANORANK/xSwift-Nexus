/******************************************************************
 * DISCORD VOICE 24/7 BOT + ROLE PANEL + LOG
 ******************************************************************/

import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  ActivityType,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} from "discord.js";

import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus
} from "@discordjs/voice";

import express from "express";
import dotenv from "dotenv";
import fs from "fs-extra";
dotenv.config();

/* ================== ENV ================== */
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 8080;

/* ================== DB (ROLE PANEL) ================== */
const PANEL_DB = "./rolePanel.json";
const loadDB = () =>
  fs.existsSync(PANEL_DB) ? fs.readJsonSync(PANEL_DB) : {};
const saveDB = d =>
  fs.writeJsonSync(PANEL_DB, d, { spaces: 2 });
let panelDB = loadDB();

/* ================== KEEP ALIVE ================== */
const app = express();
app.get("/", (_, res) => res.send("Bot alive"));
app.listen(PORT);

/* ================== CLIENT ================== */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

/* ================== CUSTOM STATUS ================== */
const STATUS_LIST = [
  ""▒▒ 20%",
  "▒▒▒▒ 40%",
  "▒▒▒▒▒▒ 60%",
  "▒▒▒▒▒▒▒▒ 80%",
  "▒▒▒▒▒▒▒▒▒▒ 100%",
  " 𓍯 ออนไลน์ .’ ⌇24/7 * ｡"
];
let statusIndex = 0;

/* ================== READY ================== */
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  setInterval(() => {
    client.user.setPresence({
      activities: [{
        name: STATUS_LIST[statusIndex],
        type: ActivityType.Custom,
        state: STATUS_LIST[statusIndex]
      }],
      status: "online"
    });
    statusIndex = (statusIndex + 1) % STATUS_LIST.length;
  }, 3000);

  const commands = [
    new SlashCommandBuilder()
      .setName("voice24")
      .setDescription("ให้บอทเข้าออนช่องเสียง 24/7")
      .addChannelOption(o =>
        o.setName("channel")
          .setDescription("เลือกช่องเสียง")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildVoice)
      ),

    new SlashCommandBuilder()
      .setName("rolepanel")
      .setDescription("สร้าง Panel รับยศ + Log (Owner)")
      .addRoleOption(o =>
        o.setName("role")
          .setDescription("ยศสำหรับคนกดรับ")
          .setRequired(true)
      )
      .addChannelOption(o =>
        o.setName("log")
          .setDescription("ช่องแจ้งเตือน Log")
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      ),

    new SlashCommandBuilder()
      .setName("botstatus")
      .setDescription("สร้าง Panel แสดงสถานะบอททั้งหมด (Owner)")
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands.map(c => c.toJSON()) }
  );
});

/* ================== INTERACTION ================== */
client.on("interactionCreate", async interaction => {

  /* ===== BUTTON (ROLE PANEL) ===== */
  if (interaction.isButton()) {
    const data = panelDB[interaction.customId];
    if (!data) return;

    const role = interaction.guild.roles.cache.get(data.roleId);
    if (!role) {
      return interaction.reply({ content: "❌ ไม่พบยศ", ephemeral: true });
    }

    if (interaction.member.roles.cache.has(role.id)) {
      return interaction.reply({
        content:
          "⚠️ คุณรับยศนี้ไปแล้วนะ\nระบบอนุญาตให้กดรับยศได้เพียง 1 ครั้งเท่านั้น",
        ephemeral: true
      });
    }

    await interaction.member.roles.add(role);

    const logChannel =
      interaction.guild.channels.cache.get(data.logChannelId);

    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setImage(
          "https://cdn.discordapp.com/attachments/1449115719479590984/1454084713579941938/1be0c476c8a40fbe206e2fbc6c5d213c.jpg"
        )
        .setDescription(`◤──•~❉᯽❉~•──◥◤──•~❉᯽❉~•──◥
<a:3005:1451585834649391144> ${interaction.user} <a:3007:1451585403751633170>
◣──•~❉᯽❉~•──◢◣──•~❉᯽❉~•──◢
╭┈ ✧ : ยินดีต้อนรับน้า ˗ˏˋ ꒰ <a:emoji_27:1449151549602271526>  ꒱
> | <a:emoji_24:1449151433130639370>・เข้าสู่ ${interaction.guild.name}
> | <a:emoji_26:1449151497064550435>・โลกแห่งการพูดคุย 
> | <a:DG36:1451619653746036910>・𝐱𝐒𝐰𝐢𝐟𝐭 𝐇𝐔𝐁 𝐂𝐨𝐦𝐦𝐮𝐧𝐢𝐭𝐲 𓆩ᥫ᭡𓆪
> | <a:1001:1451585309757149227>・ยินดีต้อนรับทุกคนน้า
> | <a:__:1451387639268642999>・อ่านกฎที่ห้องนี้ https://discord.com/channels/1449115718472826957/1449126363725561896
╰ ┈ ✧ :• ➵ Bყ Zҽɱσɳ Źx <a:__:1451387432527335605>`);
      logChannel.send({ embeds: [logEmbed] });
    }

    return interaction.reply({
      content: `✅ รับยศ ${role.name} เรียบร้อยแล้ว`,
      ephemeral: true
    });
  }

  if (!interaction.isChatInputCommand()) return;
  if (interaction.user.id !== interaction.guild.ownerId)
    return interaction.reply({ content: "❌ Owner เท่านั้น", ephemeral: true });

  /* ===== VOICE 24/7 ===== */
  if (interaction.commandName === "voice24") {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel");

    let connection = getVoiceConnection(channel.guild.id);
    if (!connection) {
      connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true
      });
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: true
        });
      } catch {}
    });

    return interaction.editReply(
      `✅ บอทออนช่อง **${channel.name}** เรียบร้อย (24/7)`
    );
  }

  /* ===== ROLE PANEL CREATE ===== */
  if (interaction.commandName === "rolepanel") {
    const role = interaction.options.getRole("role");
    const logChannel = interaction.options.getChannel("log");

    const embed = new EmbedBuilder()
      .setImage(
        "https://cdn.discordapp.com/attachments/1449115719479590984/1454084461888278589/IMG_4820.jpg"
      )
      .setDescription(`0:00 ───|────── 0:00    
      <a:emoji_11:1449150928048361603> รับยศเห็นห้อง
<a:emoji_11:1449150928048361603>
1:35 ───ㅇ───── 3:47
**╭┈ ✧ : รับยศเปิดโซนต่างๆ ˗ˏˋ ꒰ <a:emoji_34:1450185227577196780>  ꒱ **
> | - <a:__:1451387747800711189>・กดปุ่มรับยศเท่านั้น
> | - <a:1004:1451585026935488563>・ยศที่ได้ ${role}
> | - <a:DG36:1451619653746036910>・𝐱𝐒𝐰𝐢𝐟𝐭 𝐇𝐔𝐁 𝐂𝐨𝐦𝐦𝐮𝐧𝐢𝐭𝐲 𓆩ᥫ᭡𓆪
> | - <a:1001:1451585309757149227>・ยินดีต้อนรับทุกคนน้า
> | - <a:__:1451387639268642999>・อ่านกฎที่ห้องนี้ https://discord.com/channels/1449115718472826957/1449126363725561896
**╰ ┈ ✧ :• ➵ Bყ Zҽɱσɳ Źx <a:__:1451387432527335605>**`);

    const id = `rolepanel_${interaction.guild.id}`;
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(id)
        .setLabel("กดรับยศ")
        .setEmoji({ id: "1449150980179366024", animated: true })
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.channel.send({ embeds: [embed], components: [row] });

    panelDB[id] = {
      roleId: role.id,
      logChannelId: logChannel.id
    };
    saveDB(panelDB);

    return interaction.reply({
      content: "✅ สร้าง Panel + Log เรียบร้อย",
      ephemeral: true
    });
  }
});

/* ================== LOGIN ================== */
client.login(TOKEN);

/* =====================================================================
 * ================== ADD SYSTEM (APPEND ONLY) ==========================
 * ===================================================================== */

/* ===== AUTO MUTE + DEAF BOT ===== */
client.on("voiceStateUpdate", (_, newState) => {
  if (!newState.member?.user.bot) return;
  if (!newState.channelId) return;
  newState.setMute(true).catch(() => {});
  newState.setDeaf(true).catch(() => {});
});

/* ===== BOT STATUS PANEL DB ===== */
const BOT_PANEL_DB = "./botStatusPanel.json";
const loadBotPanel = () =>
  fs.existsSync(BOT_PANEL_DB) ? fs.readJsonSync(BOT_PANEL_DB) : {};
const saveBotPanel = d =>
  fs.writeJsonSync(BOT_PANEL_DB, d, { spaces: 2 });
let botPanelDB = loadBotPanel();

/* ===== BOT STATUS CONTROL DB ===== */
const BOT_STATUS_CONTROL_DB = "./botStatusControl.json";
const loadControl = () =>
  fs.existsSync(BOT_STATUS_CONTROL_DB)
    ? fs.readJsonSync(BOT_STATUS_CONTROL_DB)
    : {};
const saveControl = d =>
  fs.writeJsonSync(BOT_STATUS_CONTROL_DB, d, { spaces: 2 });
let controlDB = loadControl();

/* ===== STATUS MAP ===== */
const STATUS_MAP = {
  editing: {
    text: "กำลังแก้ไข",
    emoji: "<a:emoji_117:1454104365500465378>"
  },
  disabled: {
    text: "ปิดใช้งานชั่วคราว",
    emoji: "<a:emoji_215:1454116841923281153>"
  }
};

/* ===== CREATE / UPDATE BOT STATUS PANEL ===== */
async function updateBotPanel(guildId) {
  const data = botPanelDB[guildId];
  if (!data) return;

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const channel = guild.channels.cache.get(data.channelId);
  if (!channel) return;

  const msg = await channel.messages.fetch(data.messageId).catch(() => null);
  if (!msg) return;

  const bots = guild.members.cache.filter(m => m.user.bot);

  let desc =
    `<a:emoji_45:1450268441784221736> ┊͙สถานะ บอท xSwift Hbu ✧˖*°\n\n` +
    `╭── ⋅ ⋅ ✩ ⋅ ⋅ ──╮\n`;
  bots.forEach(b => {
    const override = controlDB[b.id];
    desc += `> <a:1001:1451585309757149227> | ${b}\n`;
    if (override && STATUS_MAP[override]) {
      desc += `> ${STATUS_MAP[override].emoji} | สถานะ : ${STATUS_MAP[override].text}\n`;
    } else {
      const online = b.presence?.status === "online";
      desc += online
        ? " > <a:green_cycle:1454103922254811280> | สถานะ : ออนไลน์\n"
        : " > <a:__:1454104236018368594> | สถานะ : ออฟไลน์\n";
    }
    desc += `> <a:phakaphop43:1454105164003934337> | ระบบ : สเถียร 95%\n`;
    desc += `> <a:emoji_46:1451252945424351310> | ทำงาน : 24/7 Day\n\n`;
  });
  desc += `╰── ⋅ ⋅ ✩ ⋅ ⋅ ──╯`;
  await msg.edit({
    embeds: [EmbedBuilder.from(msg.embeds[0]).setDescription(desc)]
  });
}

/* ===== REALTIME EVENTS ===== */
client.on("presenceUpdate", (_, newP) => {
  if (newP?.guild) updateBotPanel(newP.guild.id);
});
client.on("guildMemberAdd", m => {
  if (m.user.bot) updateBotPanel(m.guild.id);
});
client.on("guildMemberRemove", m => {
  if (m.user.bot) updateBotPanel(m.guild.id);
});

/* ===== BOT STATUS PANEL COMMAND ===== */
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "botstatus") return;
  if (interaction.user.id !== interaction.guild.ownerId)
    return interaction.reply({ content: "❌ Owner เท่านั้น", ephemeral: true });

  const embed = new EmbedBuilder()
    .setImage(
      "https://cdn.discordapp.com/attachments/1449115719479590984/1454109762613411860/221521-voxxy.gif"
    )
    .setDescription("⏳ กำลังโหลดสถานะบอท...");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("botpanel_edit")
      .setLabel("จัดการสถานะบอท")
      .setEmoji("<a:botsever51:1454105440664424571>")
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await interaction.channel.send({
    embeds: [embed],
    components: [row]
  });

  botPanelDB[interaction.guild.id] = {
    channelId: msg.channel.id,
    messageId: msg.id
  };
  saveBotPanel(botPanelDB);

  await updateBotPanel(interaction.guild.id);

  interaction.reply({
    content: "✅ สร้าง Bot Status Panel แล้ว",
    ephemeral: true
  });
});

/* ===== BUTTON → SELECT BOT + RESET ===== */
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "botpanel_edit") return;
  if (interaction.user.id !== interaction.guild.ownerId)
    return interaction.reply({ content: "❌ Owner เท่านั้น", ephemeral: true });

  const bots = interaction.guild.members.cache.filter(m => m.user.bot);

  const row1 = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("select_bot")
      .setPlaceholder("เลือกบอท")
      .addOptions(
        bots.map(b => ({
          label: b.user.username,
          value: b.id
        }))
      )
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("reset_all_bot_status")
      .setLabel("รีเซ็ตสถานะ (ออนไลน์)")
      .setStyle(ButtonStyle.Secondary)
  );

  interaction.reply({
    content: "⚙️ จัดการสถานะบอท",
    components: [row1, row2],
    ephemeral: true
  });
});

/* ===== RESET STATUS ===== */
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "reset_all_bot_status") return;
  if (interaction.user.id !== interaction.guild.ownerId)
    return interaction.reply({ content: "❌ Owner เท่านั้น", ephemeral: true });

  controlDB = {};
  saveControl(controlDB);

  await updateBotPanel(interaction.guild.id);

  interaction.reply({
    content: "♻️ รีเซ็ตสถานะบอททั้งหมดกลับเป็นออนไลน์แล้ว",
    ephemeral: true
  });
});

/* ===== SELECT BOT → SELECT STATUS ===== */
client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== "select_bot") return;

  const botId = interaction.values[0];

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`select_status:${botId}`)
      .setPlaceholder("เลือกสถานะ")
      .addOptions([
        { label: "กำลังแก้ไข", value: "editing" },
        { label: "ปิดใช้งานชั่วคราว", value: "disabled" }
      ])
  );

  interaction.update({
    content: "⚙️ เลือกสถานะ",
    components: [row]
  });
});

/* ===== APPLY STATUS ===== */
client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (!interaction.customId.startsWith("select_status:")) return;

  const botId = interaction.customId.split(":")[1];
  const status = interaction.values[0];

  controlDB[botId] = status;
  saveControl(controlDB);

  await updateBotPanel(interaction.guild.id);

  interaction.update({
    content: "✅ อัปเดตสถานะแล้ว",
    components: []
  });
});

/* ===== DISABLED INTERVAL (KEPT AS REQUESTED) ===== */
// setInterval(async () => {
//   for (const gid in botPanelDB) {
//     await updateBotPanel(gid);
//   }
// }, 500);
