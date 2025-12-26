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
  EmbedBuilder
} from "discord.js";

import { joinVoiceChannel } from "@discordjs/voice";

import express from "express";
import dotenv from "dotenv";
import fs from "fs-extra";
dotenv.config();

/* ================== ENV ================== */
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const PORT = process.env.PORT || 8080;

/* ================== DB ================== */
const PANEL_DB = "./rolePanel.json";
const loadDB = () => fs.existsSync(PANEL_DB) ? fs.readJsonSync(PANEL_DB) : {};
const saveDB = d => fs.writeJsonSync(PANEL_DB, d, { spaces: 2 });
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
    GatewayIntentBits.GuildMembers
  ]
});

/* ================== CUSTOM STATUS ================== */
const STATUS_LIST = [
  "██ 20%",
  "███ 40%",
  "████ 60%",
  "█████ 80%",
  "██████ 100%",
  "╰┈➤ ❝ [Status Online ] ❞"
];
let statusIndex = 0;

/* ================== READY ================== */
client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  setInterval(() => {
    client.user.setPresence({
      activities: [
        {
          name: STATUS_LIST[statusIndex],
          type: ActivityType.Custom,
          state: STATUS_LIST[statusIndex]
        }
      ],
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
      )
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commands.map(c => c.toJSON())
  });
});

/* ================== INTERACTION ================== */
client.on("interactionCreate", async interaction => {

  /* ===== BUTTON ===== */
  if (interaction.isButton()) {
    const data = panelDB[interaction.customId];
    if (!data) return;

    const role = interaction.guild.roles.cache.get(data.roleId);
    if (!role) {
      return interaction.reply({ content: "❌ ไม่พบยศ", ephemeral: true });
    }

    // 🔒 เช็คว่ามียศแล้วหรือยัง
    if (interaction.member.roles.cache.has(role.id)) {
      return interaction.reply({
        content: "⚠️ คุณรับยศนี้ไปแล้วนะ\nระบบอนุญาตให้กดรับยศได้เพียง 1 ครั้งเท่านั้น",
        ephemeral: true
      });
    }

    // ✅ ยังไม่มียศ → ให้ยศ
    await interaction.member.roles.add(role);

    const logChannel = interaction.guild.channels.cache.get(data.logChannelId);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setImage("https://cdn.discordapp.com/attachments/1449115719479590984/1454084713579941938/1be0c476c8a40fbe206e2fbc6c5d213c.jpg")
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

    joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false
    });

    return interaction.editReply(`✅ บอทออนช่อง **${channel.name}** เรียบร้อย (24/7)`);
  }

  /* ===== ROLE PANEL ===== */
  if (interaction.commandName === "rolepanel") {
    const role = interaction.options.getRole("role");
    const logChannel = interaction.options.getChannel("log");

    const embed = new EmbedBuilder()
      .setImage("https://cdn.discordapp.com/attachments/1449115719479590984/1454084461888278589/IMG_4820.jpg")
      .setDescription(`┍━━━━━»•» 🌺 «•«━┑    <a:emoji_11:1449150928048361603> รับยศที่นี่เลยน้า
<a:emoji_11:1449150928048361603>
┕━»•» 🌺 «•«━━━━━┙
╭┈ ✧ : รับยศเปิดโซนต่างๆ ˗ˏˋ ꒰ <a:emoji_34:1450185227577196780>  ꒱
> | <a:__:1451387747800711189>・กดปุ่มรับยศเท่านั้น
> | <a:1004:1451585026935488563>・ยศที่ได้ ${role}
> | <a:DG36:1451619653746036910>・𝐱𝐒𝐰𝐢𝐟𝐭 𝐇𝐔𝐁 𝐂𝐨𝐦𝐦𝐮𝐧𝐢𝐭𝐲 𓆩ᥫ᭡𓆪
> | <a:1001:1451585309757149227>・ยินดีต้อนรับทุกคนน้า
> | <a:__:1451387639268642999>・อ่านกฎที่ห้องนี้ https://discord.com/channels/1449115718472826957/1449126363725561896
╰ ┈ ✧ :• ➵ Bყ Zҽɱσɳ Źx <a:__:1451387432527335605>`);

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

    return interaction.reply({ content: "✅ สร้าง Panel + Log เรียบร้อย", ephemeral: true });
  }
});

/* ================== LOGIN ================== */
client.login(TOKEN);
