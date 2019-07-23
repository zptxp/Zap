var bot = require("../bot.js").bot;
var settings = require("../bot.js").settings;
var data = require("../bot.js").data;

module.exports.commands = [{cmd: "prefix", desc: "Change the guild prefix.", perm: ["manageGuild"]}, {cmd: "mentionrole", desc: "Mention a role, regardless mentionable or not.", perm: ["mentionEveryone"]}, {cmd: "mrole", desc: "Alias to `mentionrole`", perm: ["mentionEveryone"]}, {cmd: "autorole", desc: "Manage autorole.", perm: ["manageGuild", "manageRoles"]}];
module.exports.events = ["guildMemberAdd"];
module.exports.actions = function (type, cmd, body, obj) {
  if (type == "command") {
    text = body.split(" ");
    if (cmd == "mentionrole" || cmd == "mrole") {
      if (!obj.member.guild.roles.map((role) => role.name).includes(text[0])) {
        obj.channel.createMessage("I couldn't find the role you were looking for. This is usually case-sensitive.");
      }
      else {
        obj.delete();
        o = obj.member.guild.roles.find(function(role){if (role.name == text[0]) {return role;}});
        if (!o.mentionable) {
          bot.editRole(obj.member.guild.id, o.id, {mentionable: true})
          .then(function () {
            if (!text[1]) {
              obj.channel.createMessage(o.mention).then(function () {
                try {bot.editRole(obj.member.guild.id, o.id, {mentionable: false});}
                catch (e) {obj.channel.createMessage("I don't have the correct permissions to perform this action.")}
              })
            }
            else {
              obj.channel.createMessage(o.mention + ": " + body.substring(text[0].length + 1)).then(function () {
                try {bot.editRole(obj.member.guild.id, o.id, {mentionable: false});}
                catch (e) {obj.channel.createMessage("I don't have the correct permissions to perform this action.")}
              })
            }
          })
          .catch((err) => {obj.channel.createMessage("I don't have the correct permissions to perform this action.")})
        }
        else {
          if (!text[1]) {
            obj.channel.createMessage(o.mention);
          }
          else {
            obj.channel.createMessage(o.mention + ": " + body.substring(text[0].length + 1));
          }
        }
      }
    }
    else if (cmd == "prefix") {
      if (body != "" && body != settings.get("prefix")) {
        data.set("guilds." + obj.member.guild.id + ".prefix", text[0]);
        obj.channel.createMessage("Changed the prefix for this guild to `" + text[0] + "`.");
      }
      else {
        data.del("guilds." + obj.member.guild.id + ".prefix");
        obj.channel.createMessage("Reset the prefix for this guild to the default global prefix `" + settings.get("prefix") + "`.")
      }
    }
    else if (cmd == "autorole") {
      if (text[0].toLowerCase() == "add") {
        if (!text[1]) {obj.channel.createMessage("Please specify the role to add.\nValid role formats: `602110731156062208`, `Member`");}
        else {
          roleId = "";
          if (!data.get("guilds." + obj.member.guild.id + ".autorole")) {autorole = []; data.set("guilds." + obj.member.guild.id + ".autorole", autorole);}
          if (!obj.member.guild.roles.map((role) => role.name).includes(text[1]) && !obj.member.guild.roles.map((role) => role.id).includes(text[1])) {obj.channel.createMessage("I couldn't find the role you were looking for. Names are usually case-sensitive.");}
          else if (obj.member.guild.roles.map((role) => role.id).includes(text[1])) {roleId = text[1];}
          else {
            o = obj.member.guild.roles.find(function(role) {if (role.name == text[1]) {return role;}})
            roleId = o.id;
          }
          if (roleId != "") {
            autorole = data.get("guilds." + obj.member.guild.id + ".autorole");
            if (autorole.find(function(a) {return a == roleId;}) == roleId) {obj.channel.createMessage("That role is already in use for autorole!");}
            else {
              autorole.push(roleId);
              data.set("guilds." + obj.member.guild.id + ".autorole", autorole);
              // won't even bother returning the name of role because I allow use of IDs, just going to complicate it further
              obj.channel.createMessage("Added the role to autorole.");
            }
          }
        }
      }
      else if (text[0].toLowerCase() == "remove") {
        if (!data.get("guilds." + obj.member.guild.id + ".autorole")) {autorole = []; data.set("guilds." + obj.member.guild.id + ".autorole", autorole);}
        if (parseInt(text[1], 10) > data.get("guilds." + obj.member.guild.id + ".autorole").length || parseInt(text[1], 10) < 1 || parseInt(text[1], 10) != parseInt(text[1], 10)) {
          obj.channel.createMessage("Invalid index. Try using `autorole list` to find the role you want to remove.");
        }
        else {
          autorole = data.get("guilds." + obj.member.guild.id + ".autorole");
          index = parseInt(text[1], 10) - 1;
          try {roleName = obj.member.guild.roles.get(autorole[index]).name;}
          catch (e) {roleName = "~~Missing Role~~";}
          obj.channel.createMessage("Removing " + roleName + " `" + autorole[index] + "`.");
          autorole.splice(index, 1);
          data.set("guilds." + obj.member.guild.id + ".autorole", autorole);
        }
      }
      else if (text[0].toLowerCase() == "list") {
        number = 0;
        arr = [];
        if (!data.get("guilds." + obj.member.guild.id + ".autorole")) {autorole = []; data.set("guilds." + obj.member.guild.id + ".autorole", autorole);}
        if (data.get("guilds." + obj.member.guild.id + ".autorole").length == 0) {
          obj.channel.createMessage("There were no roles found in use for autorole.");
        }
        else {
          while (number < data.get("guilds." + obj.member.guild.id + ".autorole").length) {
            index = number+1;
            try {roleName = obj.member.guild.roles.get(data.get("guilds." + obj.member.guild.id + ".autorole")[number]).name;}
            catch (e) {roleName = "~~Missing Role~~";}
            roleId = data.get("guilds." + obj.member.guild.id + ".autorole")[number];
            arr.push("`" + index + "` | " + roleName + " `" + roleId + "`");
            number++;
          }
          setTimeout(function() {
            obj.channel.createMessage("Adding the following roles to new users:\n" + arr.join("\n"))
          }, 5)
        }
      }
      else {obj.channel.createMessage("Please specify what action you would like to do.\nValid actions: `add`, `remove`, `list`");}
    }
  }
  else if (type == "guildMemberAdd") {
    if (data.get("guilds." + obj[0].id + ".autorole")) {
      autorole = data.get("guilds." + obj[0].id + ".autorole");
      num = 0;
      while (num < autorole.length) {
        obj[1].addRole(autorole[num], "Autorole").catch((err) => {
          console.log("[Error] Encountered an error while attempting autorole in guild " + obj[0].id + ":\n" + err);
        });
        num++;
      }
    }
  }
}
module.exports.managersOnly = false;
module.exports.name = "management";
