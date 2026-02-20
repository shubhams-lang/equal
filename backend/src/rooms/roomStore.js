const redis = require("../config/redis");

exports.createRoom = async (inviteCode, roomName) => {
  await redis.hmset(`room:${inviteCode}`, {
    name: roomName
  });

  await redis.del(`room:${inviteCode}:members`);
  await redis.del(`room:${inviteCode}:messages`);
};

exports.getRoom = async (inviteCode) => {
  return await redis.hgetall(`room:${inviteCode}`);
};

exports.addMember = async (inviteCode, username) => {
  await redis.sadd(`room:${inviteCode}:members`, username);
};

exports.removeMember = async (inviteCode, username) => {
  await redis.srem(`room:${inviteCode}:members`, username);
};

exports.getMembers = async (inviteCode) => {
  return await redis.smembers(`room:${inviteCode}:members`);
};

exports.addMessage = async (inviteCode, message) => {
  await redis.rpush(
    `room:${inviteCode}:messages`,
    JSON.stringify(message)
  );
};

exports.getMessages = async (inviteCode) => {
  const messages = await redis.lrange(
    `room:${inviteCode}:messages`,
    0,
    -1
  );
  return messages.map(m => JSON.parse(m));
};
