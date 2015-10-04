#!/usr/bin/env node
var fs = require('fs'),
    path = require('path'),
    moment = require('moment-timezone'),
    _ = require('lodash');

if(!process.argv[2]) {
  console.log("USEAGE: ./ext.js <date>");
  process.exit();
}

var logPath = './log';
var dt = new Date();
var date = process.argv[2];
var format = 'YYYY-MM-DD';
var tz = 'Asia/Seoul';

var today = moment.tz(date, format, tz).add(1, 'days');
var yesterday = moment.tz(date, format, tz);
var tsToday = today.format('X');
var tsYesterday = yesterday.format('X');

console.log('from', yesterday.format(), 'to', today.format());

function getDirectories(srcpath) {
  return fs.readdirSync(srcpath).filter(function(file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
}

function getLog(dir, date) {
  var allowed_date = [
    date.add(2, 'days').format(format) + '.json',
    date.subtract(1,'days').format(format) + '.json',
    date.subtract(1,'days').format(format) + '.json',
    date.subtract(1,'days').format(format) + '.json',
    date.subtract(1,'days').format(format) + '.json'
  ];
  return fs.readdirSync(dir).filter(function(file) {
    return allowed_date.indexOf(file) !== -1;
  }).map(function(file){ return dir + '/' + file });
}

function Users(path){
  this.list = require(path);
}

Users.prototype.get = function(id) {
  return this.list.filter(function(user) {
    return user.id == id
  }).pop();
}

var users = new Users(logPath + '/users.json');
var channels = getDirectories(logPath);

var logs = [];

channels.forEach(function(channel){
  var log = getLog(logPath + '/' + channel, moment(date, format));
  if(log.length === 0) return;
  log = log.reduce(function(a, b){ return a.concat(require(b))}, []);
  logs.push({
    channel: channel,
    log: log
  });
});

logs.forEach(function(log){
  var messages = log.log;
  var filtered = messages.filter(function(message){
      return message.ts <= tsToday && message.ts >= tsYesterday;
    }).filter(function(message){
      if(!message['attachments']) return false;
      return message.attachments.filter(function(attachment){
        return (attachment.title && attachment.title_link) || attachment.from_url
    }).length > 0
  })

  if(filtered.length == 0) return true;

  console.log("\n# " + log.channel + "\n");

  filtered.forEach(function(message){
    var username = users.get(message.user);
    username = username ? username.name : 'Anonymous';
    message.attachments.forEach(function(attachment){
      if(attachment.title && attachment.title_link)
        console.log('- ['+ attachment.title +'](' + (attachment.title_link) + ') ('+ username +')');
      else if(attachment.from_url)
        console.log('- ['+ attachment.from_url +'](' + (attachment.from_url) + ') ('+ username +')');
    });
  });
})
