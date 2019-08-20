var bot = require("../bot.js").bot;
var settings = require("../bot.js").settings;
var data = require("../bot.js").data;
getRndInteger = require("../bot.js").getRndInteger;
isNumeric = require("../bot.js").isNumeric;
function findAvailableStaff(department) {
  if (department == "ps") {
    members = bot.guilds.get(settings.get("tickets.guildId")).members.filter(function(member){return member.roles.find(function(role){return role == settings.get("tickets.psRoleId")})});
  }
  else if (department == "rp") {
    members = bot.guilds.get(settings.get("tickets.guildId")).members.filter(function(member){return member.roles.find(function(role){return role == settings.get("tickets.rpRoleId")})});
  }
  else if (department == "t") {
    members = bot.guilds.get(settings.get("tickets.guildId")).members.filter(function(member){return member.roles.find(function(role){return role == settings.get("tickets.tRoleId")})});
  }
  else if (department == "rb") {
    members = bot.guilds.get(settings.get("tickets.guildId")).members.filter(function(member){return member.roles.find(function(role){return role == settings.get("tickets.rbRoleId")})});
  }
  else if (department == "other") {
    members = bot.guilds.get(settings.get("tickets.guildId")).members.filter(function(member){return member.roles.find(function(role){return role == settings.get("tickets.otherRoleId")})});
  }
  if (members.length == 1) {
    return members[0].id;
  }
  else if (members.length > 1) {
    return members[getRndInteger(0, members.length - 1)].id;
  }
  else {
    return "nil";
  }
}

module.exports.tickets = setInterval(function() {
  function pValidation(channel) {
    if (data.get("tickets.channels." + channel.id + ".assigned") == "pending") {return true;}
    else {return false;}
  }
  function cValidation(channel) {
    if (typeof data.get("tickets.channels." + channel.id + ".closeTime") == "string") {return true;}
    else {return false;}
  }
  channels = bot.guilds.get(settings.get("tickets.guildId")).channels.filter(pValidation);
  cChannels = bot.guilds.get(settings.get("tickets.guildId")).channels.filter(cValidation);
  n = 0;
  nn = 0;
  while (n < channels.length) {
    if (new Date() - new Date(data.get("tickets.channels." + channels[n].id + ".pendingTime")) >= 3600000) {
      staffId = findAvailableStaff(data.get("tickets.channels." + channels[n].id + ".dept"));
      channels[n].editPermission(settings.get("tickets." + data.get("tickets.channels." + channels[n].id + ".dept") + "RoleId"), 1024, 2048, "role");
      channels[n].editPermission(staffId, 3072, 0, "member");
      data.set("tickets.channels." + channels[n].id + ".assigned", staffId);
      channels[n].edit({topic: "Department: " + settings.get("tickets." + data.get("tickets.channels." + channels[n].id + ".dept") + "String") + " | Assigned to <@" + staffId + ">", parentID: settings.get("tickets.activeCategoryId")});
      channels[n].editPosition(0);
      channels[n].createMessage({
        content: "<@" + data.get("tickets.channels." + channels[n].id + ".user") + ">",
        embed: {
          title: "Claimed (Automatically Assigned)",
          description: "Your ticket has been automatically assigned to <@" + staffId + ">!",
          timestamp: new Date().toISOString(),
          color: 0x00FF00
        }
      })
      data.del("tickets.channels." + channels[n].id + ".pendingTime");
    }
    n++;
  }
  while (nn < cChannels.length) {
    if (new Date() - new Date(data.get("tickets.channels." + cChannels[nn].id + ".closeTime")) >= 43200000) {
      user = bot.users.get(data.get("tickets.channels." + cChannels[nn].id + ".user"));
      assigned = bot.users.get(data.get("tickets.channels." + cChannels[nn].id + ".assigned"));
      if (typeof data.get("tickets.channels." + cChannels[nn].id + ".saved") == "object") {
        save = data.get("tickets.channels." + cChannels[nn].id + ".saved");
        savedMapped = save.map(str => "`" + str + "`");
        bot.getDMChannel(user.id).then(function(userChannel) {
          userChannel.createMessage("Here are the important details in your (closed) ticket:\n" + savedMapped.join("\n"));
        })
        saved = savedMapped.join("\n");
      }
      else {saved = "None"}
      data.del("tickets.channels." + cChannels[nn].id);
      data.del("tickets.users." + user.id);
      cChannels[nn].delete();
      bot.createMessage(settings.get("tickets.notificationChat"), {
        embed: {
          title: "Ticket Closed",
          description: "Closed a ticket automatically after 12 hours of resolve state.",
          fields: [
            {
              name: "Ticket Owner",
              value: "**" + user.username + "#" + user.discriminator + "** `" + user.id + "`"
            },
            {
              name: "Ticket Assigned",
              value: "**" + assigned.username + "#" + assigned.discriminator + "** `" + assigned.id + "`"
            },
            {
              name: "Rating",
              value: "None"
            },
            {
              name: "Saved",
              value: saved
            }
          ],
          timestamp: new Date().toISOString(),
          color: 0xFFD700
        }
      })
    }
    nn++;
  }
}, 60000);
module.exports.commands = [{cmd: "pending", desc: "Send a ticket back to pending.", perm: []}, {cmd: "assign", desc: "Assign a ticket to another user.", perm: []}, {cmd: "solve", desc: "Solve a ticket.", perm: []}, {cmd: "resolve", desc: "Alias to `solve`", perm: []}];
module.exports.events = ["messageReactionAdd", "messageCreate", "guildMemberRemove"];
module.exports.actions = function (type, cmd, body, obj) {
  if (type == "messageReactionAdd" && obj[0].channel.id == settings.get("tickets.channelId") && obj[1].name == "📩") {
    bot.removeMessageReaction(obj[0].channel.id, obj[0].id, "📩", obj[2]);
    if (!data.get("tickets.users." + obj[2])) {
      if (obj[0].id == settings.get("tickets.psMessageId")) {department = "ps";}
      else if (obj[0].id == settings.get("tickets.rpMessageId")) {department = "rp";}
      else if (obj[0].id == settings.get("tickets.tMessageId")) {department = "t";}
      else if (obj[0].id == settings.get("tickets.rbMessageId")) {department = "rb";}
      else if (obj[0].id == settings.get("tickets.otherMessageId")) {department = "other";}
      deptString = settings.get("tickets." + department + "String");
      roleId = settings.get("tickets." + department + "RoleId");
      member = bot.guilds.get(settings.get("tickets.guildId")).members.get(obj[2]);
      bot.createChannel(settings.get("tickets.guildId"), department + "-" + member.username, 0, "Ticket Channel", {topic: "Department: " + deptString + " | Pending", parentID: settings.get("tickets.pendingCategoryId")}).then(function(channel) {
        channel.editPermission(roleId, 3072, 0, "role");
        channel.editPermission(obj[2], 3072, 0, "member");
        channel.createMessage({
          content: "<@" + obj[2] + ">",
          embed: {
            title: "Support Ticket (" + deptString + ")",
            description: "Thanks for contacting our support team!\nYour ticket is currently pending.\nAs soon as a staff member claims your ticket, you will be notified.\nThank you for your patience.\n\nTo close this ticket, simply click or tap on the 🔒 below.",
            timestamp: new Date().toISOString(),
            color: 0x00FF00
          }
        }).then(function(msg) {
          msg.addReaction("🔒");
          msg.pin();
        });
        data.set("tickets.channels." + channel.id + ".user", obj[2]);
        data.set("tickets.channels." + channel.id + ".assigned", "pending");
        data.set("tickets.channels." + channel.id + ".dept", department);
        data.set("tickets.channels." + channel.id + ".pendingTime", new Date().toISOString())
        data.set("tickets.users." + obj[2], channel.id);
      })
    }
    else {
      bot.getDMChannel(obj[2]).then(function(channel) {
        channel.createMessage({
          embed: {
            title: "Cannot create ticket",
            description: "You already have a ticket open at <#" + data.get("tickets.users." + obj[2]) + ">!",
            color: 0xFF0000
          }
        })
      })
    }
  }
  else if (type == "messageReactionAdd" && obj[2] != bot.user.id) {
    if (data.get("tickets.channels." + obj[0].channel.id + ".user") == obj[2]) {
      if (obj[1].name == "🔒") {
        user = bot.users.get(data.get("tickets.channels." + obj[0].channel.id + ".user"));
        assigned = bot.users.get(data.get("tickets.channels." + obj[0].channel.id + ".assigned"));
        if (typeof data.get("tickets.channels." + obj[0].channel.id + ".saved") == "object") {
          save = data.get("tickets.channels." + obj[0].channel.id + ".saved");
          savedMapped = save.map(str => "`" + str + "`");
          bot.getDMChannel(user.id).then(function(userChannel) {
            userChannel.createMessage("Here are the important details in your (closed) ticket:\n" + savedMapped.join("\n"));
          })
          saved = savedMapped.join("\n");
        }
        else {saved = "None"}
        if (typeof assigned == "undefined") {assignedString = "None (pending)"}
        else {assignedString = "**" + assigned.username + "#" + assigned.discriminator + "** `" + assigned.id + "`"}
        data.del("tickets.channels." + obj[0].channel.id);
        data.del("tickets.users." + obj[2]);
        obj[0].channel.delete();
        bot.createMessage(settings.get("tickets.notificationChat"), {
          embed: {
            title: "Ticket Closed",
            description: "Closed a ticket by user request.",
            fields: [
              {
                name: "Ticket Owner",
                value: "**" + user.username + "#" + user.discriminator + "** `" + user.id + "`"
              },
              {
                name: "Ticket Assigned",
                value: assignedString
              },
              {
                name: "Rating",
                value: "None"
              },
              {
                name: "Saved",
                value: saved
              }
            ],
            timestamp: new Date().toISOString(),
            color: 0xFFD700
          }
        })
      }
      else if (obj[1].name == "👍") {
        user = bot.users.get(data.get("tickets.channels." + obj[0].channel.id + ".user"));
        assigned = bot.users.get(data.get("tickets.channels." + obj[0].channel.id + ".assigned"));
        if (typeof data.get("tickets.channels." + obj[0].channel.id + ".saved") == "object") {
          save = data.get("tickets.channels." + obj[0].channel.id + ".saved");
          savedMapped = save.map(str => "`" + str + "`");
          bot.getDMChannel(user.id).then(function(userChannel) {
            userChannel.createMessage("Here are the important details in your (closed) ticket:\n" + savedMapped.join("\n"));
          })
          saved = savedMapped.join("\n");
        }
        else {saved = "None"}
        if (typeof assigned == "undefined") {assignedString = "None (pending)"}
        else {assignedString = "**" + assigned.username + "#" + assigned.discriminator + "** `" + assigned.id + "`"}
        data.del("tickets.channels." + obj[0].channel.id);
        data.del("tickets.users." + obj[2]);
        obj[0].channel.delete();
        bot.createMessage(settings.get("tickets.notificationChat"), {
          embed: {
            title: "Ticket Closed",
            description: "Closed a ticket by user request.",
            fields: [
              {
                name: "Ticket Owner",
                value: "**" + user.username + "#" + user.discriminator + "** `" + user.id + "`"
              },
              {
                name: "Ticket Assigned",
                value: assignedString
              },
              {
                name: "Rating",
                value: "👍"
              },
              {
                name: "Saved",
                value: saved
              }
            ],
            timestamp: new Date().toISOString(),
            color: 0xFFD700
          }
        })
      }
      else if (obj[1].name == "👎") {
        user = bot.users.get(data.get("tickets.channels." + obj[0].channel.id + ".user"));
        assigned = bot.users.get(data.get("tickets.channels." + obj[0].channel.id + ".assigned"));
        if (typeof data.get("tickets.channels." + obj[0].channel.id + ".saved") == "object") {
          save = data.get("tickets.channels." + obj[0].channel.id + ".saved");
          savedMapped = save.map(str => "`" + str + "`");
          bot.getDMChannel(user.id).then(function(userChannel) {
            userChannel.createMessage("Here are the important details in your (closed) ticket:\n" + savedMapped.join("\n"));
          })
          saved = savedMapped.join("\n");
        }
        else {saved = "None"}
        if (typeof assigned == "undefined") {assignedString = "None (pending)"}
        else {assignedString = "**" + assigned.username + "#" + assigned.discriminator + "** `" + assigned.id + "`"}
        data.del("tickets.channels." + obj[0].channel.id);
        data.del("tickets.users." + obj[2]);
        obj[0].channel.delete();
        bot.createMessage(settings.get("tickets.notificationChat"), {
          embed: {
            title: "Ticket Closed",
            description: "Closed a ticket by user request.",
            fields: [
              {
                name: "Ticket Owner",
                value: "**" + user.username + "#" + user.discriminator + "** `" + user.id + "`"
              },
              {
                name: "Ticket Assigned",
                value: assignedString
              },
              {
                name: "Rating",
                value: "👎"
              },
              {
                name: "Saved",
                value: saved
              }
            ],
            timestamp: new Date().toISOString(),
            color: 0xFFD700
          }
        })
      }
      else if (obj[1].name == "📂") {
        user = bot.users.get(data.get("tickets.channels." + obj[0].channel.id + ".user"));
        obj[0].removeReactions();
        obj[0].channel.editPermission(data.get("tickets.channels." + obj[0].channel.id + ".user"), 3072, 0, "member");
        obj[0].channel.editPermission(settings.get("tickets." + data.get("tickets.channels." + obj[0].channel.id + ".dept") + "RoleId"), 3072, 0, "role");
        data.set("tickets.channels." + obj[0].channel.id + ".assigned", "pending");
        data.del("tickets.channels." + obj[0].channel.id + ".closeTime");
        data.set("tickets.channels." + obj[0].channel.id + ".pendingTime", new Date().toISOString());
        obj[0].channel.edit({name: data.get("tickets.channels." + obj[0].channel.id + ".dept") + "-" + user.username, topic: "Department: " + settings.get("tickets." + data.get("tickets.channels." + obj[0].channel.id + ".dept") + "String") + " | Pending", parentID: settings.get("tickets.pendingCategoryId")});
        obj[0].channel.createMessage("Ticket reopened. To close the ticket, use the 🔒 in the pinned message.");
      }
    }
    else if (data.get("tickets.channels." + obj[0].channel.id + ".user") != obj[2] && typeof data.get("tickets.channels." + obj[0].channel.id + ".user") == "string") {
      bot.removeMessageReaction(obj[0].channel.id, obj[0].id, obj[1].name, obj[2]);
    }
  }
  else if (type == "guildMemberRemove" && obj[0].id == settings.get("tickets.guildId") && typeof data.get("tickets.users." + obj[1].id) == "string") {
    user = bot.users.get(obj[1].id);
    assigned = bot.users.get(data.get("tickets.channels." + data.get("tickets.users." + obj[1].id) + ".assigned"));
    if (typeof data.get("tickets.channels." + data.get("tickets.users." + obj[1].id) + ".saved") == "object") {
      save = data.get("tickets.channels." + data.get("tickets.users." + obj[1].id) + ".saved");
      savedMapped = save.map(str => "`" + str + "`");
      saved = savedMapped.join("\n");
    }
    else {saved = "None"}
    if (typeof assigned == "undefined") {assignedString = "None (pending)"}
    else {assignedString = "**" + assigned.username + "#" + assigned.discriminator + "** `" + assigned.id + "`"}
    data.del("tickets.channels." + data.get("tickets.users." + obj[1].id));
    data.del("tickets.users." + obj[1].id);
    bot.deleteChannel(data.get("tickets.users." + obj[1].id))
    bot.createMessage(settings.get("tickets.notificationChat"), {
      embed: {
        title: "Ticket Closed",
        description: "Closed a ticket as user left the guild.",
        fields: [
          {
            name: "Ticket Owner",
            value: "**" + user.username + "#" + user.discriminator + "** `" + user.id + "`"
          },
          {
            name: "Ticket Assigned",
            value: assignedString
          },
          {
            name: "Rating",
            value: "None"
          },
          {
            name: "Saved",
            value: saved
          }
        ],
        timestamp: new Date().toISOString(),
        color: 0xFFD700
      }
    })
  }
  else if (type == "messageCreate" && obj.channel.parentID == settings.get("tickets.pendingCategoryId") && obj.author.id != data.get("tickets.channels." + obj.channel.id + ".user") && !obj.author.bot) {
    obj.channel.editPermission(settings.get("tickets." + data.get("tickets.channels." + obj.channel.id + ".dept") + "RoleId"), 1024, 2048, "role");
    obj.channel.editPermission(obj.author.id, 3072, 0, "member");
    data.set("tickets.channels." + obj.channel.id + ".assigned", obj.author.id);
    obj.channel.edit({topic: "Department: " + settings.get("tickets." + data.get("tickets.channels." + obj.channel.id + ".dept") + "String") + " | Assigned to <@" + obj.author.id + ">", parentID: settings.get("tickets.activeCategoryId")});
    obj.channel.editPosition(0);
    obj.channel.createMessage({
      content: "<@" + data.get("tickets.channels." + obj.channel.id + ".user") + ">",
      embed: {
        title: "Claimed",
        description: "Your ticket has been claimed by <@" + obj.author.id + ">!",
        timestamp: new Date().toISOString(),
        color: 0x00FF00
      }
    })
    data.del("tickets.channels." + obj.channel.id + ".pendingTime");
  }
  else if (type == "command" && cmd == "pending") {
    if (obj.member.guild.id != settings.get("tickets.guildId")) {obj.channel.createMessage("This command is limited to guilds configured by the bot owner only.")}
    else if (!obj.member.roles.includes(settings.get("tickets.otherRoleId"))) {
      obj.channel.createMessage("You are not a Support member!")
    }
    else if (obj.channel.parentID != settings.get("tickets.activeCategoryId")) {
      obj.channel.createMessage("This command can only be run in an active ticket.")
    }
    else if (body == "") {
      obj.channel.deletePermission(data.get("tickets.channels." + obj.channel.id + ".assigned"));
      obj.channel.editPermission(settings.get("tickets." + data.get("tickets.channels." + obj.channel.id + ".dept") + "RoleId"), 3072, 0, "role");
      data.set("tickets.channels." + obj.channel.id + ".assigned", "pending");
      obj.channel.edit({topic: "Department: " + settings.get("tickets." + data.get("tickets.channels." + obj.channel.id + ".dept") + "String") + " | Pending", parentID: settings.get("tickets.pendingCategoryId")});
      obj.channel.createMessage({
        content: "<@" + data.get("tickets.channels." + obj.channel.id + ".user") + ">",
        embed: {
          title: "Unclaimed",
          description: "Your ticket has been sent back to pending.\nPlease wait while another staff member claims the ticket.\n\nThank you for your patience.",
          timestamp: new Date().toISOString(),
          color: 0x0000FF
        }
      })
      data.set("tickets.channels." + obj.channel.id + ".pendingTime", new Date().toISOString())
    }
    else if (body == "ps" || body == "rp" || body == "t" || body == "rb" || body == "other") {
      originalRoleId = settings.get("tickets." + data.get("tickets.channels." + obj.channel.id + ".dept") + "RoleId");
      user = bot.users.get(data.get("tickets.channels." + obj.channel.id + ".user"));
      obj.channel.deletePermission(data.get("tickets.channels." + obj.channel.id + ".assigned"));
      obj.channel.deletePermission(originalRoleId);
      obj.channel.editPermission(settings.get("tickets." + body + "RoleId"), 3072, 0, "role");
      data.set("tickets.channels." + obj.channel.id + ".assigned", "pending");
      data.set("tickets.channels." + obj.channel.id + ".dept", body);
      obj.channel.edit({name: body + "-" + user.username, topic: "Department: " + settings.get("tickets." + body + "String") + " | Pending", parentID: settings.get("tickets.pendingCategoryId")});
      obj.channel.createMessage({
        content: "<@" + data.get("tickets.channels." + obj.channel.id + ".user") + ">",
        embed: {
          title: "Unclaimed",
          description: "Your ticket has been sent back to pending.\nPlease wait while another staff member claims the ticket.\n\nThank you for your patience.",
          timestamp: new Date().toISOString(),
          color: 0x0000FF
        }
      })
      data.set("tickets.channels." + obj.channel.id + ".pendingTime", new Date().toISOString())
    }
    else {
      obj.channel.createMessage("Something went wrong. You may have specified an invalid department. (Please only use department codes: `ps`, `rp`, `t`, `rb`, `other`)")
    }
  }
  else if (type == "command" && cmd == "assign") {
    text = body.split(" ");
    if (obj.member.guild.id != settings.get("tickets.guildId")) {obj.channel.createMessage("This command is limited to guilds configured by the bot owner only.")}
    else if (!obj.member.roles.includes(settings.get("tickets.otherRoleId"))) {
      obj.channel.createMessage("You are not a Support member!")
    }
    else if (obj.channel.parentID != settings.get("tickets.activeCategoryId")) {
      obj.channel.createMessage("This command can only be run in an active ticket.")
    }
    else if (body == "" || !isNumeric(text[0]) && obj.mentions.length == 0) {obj.channel.createMessage("Please specify a user to assign the ticket to.")}
    else {
      if (isNumeric(text[0])) {id = text[0]}
      else {id = obj.mentions[0].id}
      if (id == data.get("tickets.channels." + obj.channel.id + ".assigned")) {obj.channel.createMessage("That user is already assigned to the ticket!")}
      else if (id == data.get("tickets.channels." + obj.channel.id + ".user")) {obj.channel.createMessage("That user owns this ticket!")}
      else {
        original = data.get("tickets.channels." + obj.channel.id + ".assigned");
        obj.channel.deletePermission(original);
        obj.channel.editPermission(id, 3072, 0, "member");
        data.set("tickets.channels." + obj.channel.id + ".assigned", id);
        obj.channel.edit({topic: "Department: " + settings.get("tickets." + data.get("tickets.channels." + obj.channel.id + ".dept") + "String") + " | Assigned to <@" + id + ">"})
        obj.channel.createMessage({
          content: "<@" + data.get("tickets.channels." + obj.channel.id + ".user") + ">",
          embed: {
            title: "Re-assigned",
            description: "Your ticket has been re-assigned to <@" + id + ">.\nNo further action is required from you.\n\nThank you for your patience.",
            timestamp: new Date().toISOString(),
            color: 0x0000FF
          }
        })
      }
    }
  }
  else if (type == "command" && cmd == "solve" || type == "command" && cmd == "resolve") {
    if (obj.member.guild.id != settings.get("tickets.guildId")) {obj.channel.createMessage("This command is limited to guilds configured by the bot owner only.")}
    else if (!obj.member.roles.includes(settings.get("tickets.otherRoleId"))) {
      obj.channel.createMessage("You are not a Support member!")
    }
    else if (obj.channel.parentID != settings.get("tickets.activeCategoryId")) {
      obj.channel.createMessage("This command can only be run in an active ticket.")
    }
    else {
      user = bot.users.get(data.get("tickets.channels." + obj.channel.id + ".user"));
      assigned = bot.users.get(data.get("tickets.channels." + obj.channel.id + ".assigned"));
      obj.channel.deletePermission(settings.get("tickets." + data.get("tickets.channels." + obj.channel.id + ".dept") + "RoleId"));
      obj.channel.deletePermission(data.get("tickets.channels." + obj.channel.id + ".assigned"));
      obj.channel.editPermission(data.get("tickets.channels." + obj.channel.id + ".user"), 1024, 2048, "member");
      obj.channel.edit({name: "closed-" + user.username, topic: "Feedback | Ticket Closed", parentID: settings.get("tickets.closedCategoryId")});
      data.set("tickets.channels." + obj.channel.id + ".closeTime", new Date().toISOString());
      obj.channel.createMessage({
        content: "<@" + data.get("tickets.channels." + obj.channel.id + ".user") + ">",
        embed: {
          title: "Ticket Closed",
          description: "Your ticket has been marked as resolved.\nTo reopen the ticket, click or tap on the 📂 below.\n\nAlternatively, use the 👍 or 👎 reaction to close the ticket and leave a rating for our support staff, or use the 🔒 reaction to close the ticket.\n\nThis ticket will automatically close in 12 hours.",
          color: 0xFFD700,
          timestamp: new Date().toISOString(),
          footer: {
            text: assigned.username + "#" + assigned.discriminator,
            icon_url: assigned.avatarURL
          }
        }
      }).then(function(msg) {
        msg.addReaction("📂");
        msg.addReaction("👍");
        msg.addReaction("👎");
        msg.addReaction("🔒");
      })
    }
  }
}
module.exports.managersOnly = false;
module.exports.name = "tickets";
