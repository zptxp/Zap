var bot = require("../bot.js").bot;
var settings = require("../bot.js").settings;
var data = require("../bot.js").data;

module.exports.commands = [];
module.exports.events = ["guildMemberAdd", "guildMemberRemove"];
module.exports.actions = function (type, cmd, body, obj) {
  if (type == "guildMemberAdd" && obj[0].id == "574949938929074186") {
    // Welcome Message
    bot.createMessage("574950095301115914", {
      content: obj[1].mention,
      embed: {
        title: "Welcome!",
        color: 0x2263EA,
        description: "Hey! Welcome to " + obj[1].guild.name + "!\n\n📌 Information:\n\n▸ Upgrade | <#575823400115896321>\n▸ Redeem | <#575823572203864064>\n▸ Support | <#575805177416646698>\n▸ Invite | https://discord.gg/enTsYhx"
      }
    });
    bot.editChannel("590737065566666752", {name: "Member Count: " + obj[0].members.size});
    bot.editChannel("589907400459419688", {name: "User Count: " + obj[0].members.filter(function(member){if (!member.bot) {return true;} else {return false;}}).length});
  }
  else if (type == "guildMemberRemove" && obj[0].id == "574949938929074186") {
    bot.editChannel("590737065566666752", {name: "Member Count: " + obj[0].members.size});
    bot.editChannel("589907400459419688", {name: "User Count: " + obj[0].members.filter(function(member){if (!member.bot) {return true;} else {return false;}}).length});
  }
}
module.exports.managersOnly = false;
module.exports.name = "MSU";
