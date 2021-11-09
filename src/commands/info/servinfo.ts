import * as Discord from "discord.js";
import { timestamp } from "../../utils/Timestamp";

// Member command

/**
 * Shows information about a server.
 * @param {Discord.Client} Client the client
 * @param {Discord.CommandInteraction & Discord.Message} Interaction the slash command that contains the interaction name
 * @param {string[]} args the command args
 * @param {any} options some options
 */
module.exports = {
	name: "servinfo",
	description: "Get useful information from a server",
	category: "info",

	async execute(Client: Discord.Client, interaction: Discord.CommandInteraction & Discord.Message) {
		let afkChannel: any;
		const guildPicture: string = interaction.guild.iconURL();

		if (interaction.member.guild.afkChannel) {
			afkChannel = `#<${interaction.guild.afkChannel}>`;
		} else {
			afkChannel = "None.";
		}

		const reponse: Discord.MessageEmbed = new Discord.MessageEmbed()
			.setThumbnail(guildPicture)
			.setAuthor(`${interaction.guild.name}`, guildPicture)
			.setColor("RANDOM")
			.addField(`**${interaction.guild.channels.cache.filter(channel => channel.type !== "GUILD_CATEGORY").size}** channels`, `• Text: **${interaction.guild.channels.cache.filter((channel: Discord.TextChannel) => channel.type === "GUILD_TEXT").size}** \n• Voice: **${interaction.guild.channels.cache.filter((channel: Discord.VoiceChannel) => channel.type === "GUILD_VOICE").size}**`, true)
			.addField("Owner", (await interaction.guild.fetchOwner()).user.tag, true)
			.addField("Created on", timestamp(interaction.guild.createdAt.getTime()), true)
			.addField("Verification", interaction.guild.verificationLevel, true)
			.addField("Boosts", `**${interaction.guild.premiumSubscriptionCount}**`, true)
			.addField("Roles", `**${interaction.guild.roles.cache.size}**`, true)
			.addField("AFK", afkChannel, true)
			.setFooter(Client.user.username, Client.user.avatarURL())
			.setTimestamp();

		if (interaction.guild.banner) {
			reponse.setImage(interaction.guild.bannerURL());
		}

		interaction.editReply({ embeds: [reponse] });
	}
}

