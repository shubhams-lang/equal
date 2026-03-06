const redis = require("../config/redis");

/**
 * Creates a new room hash and clears any stale member/message data.
 */
exports.createRoom = async (inviteCode, roomName) => {
  const roomKey = `room:${inviteCode}`;
  
  await redis.hmset(roomKey, {
    name: roomName,
    createdAt: new Date().toISOString(),
  });

  // Ensure we start with a clean slate for this invite code
  await redis.del(`${roomKey}:members`);
  await redis.del(`${roomKey}:messages`);
};

/**
 * Returns basic room metadata (name, etc.)
 */
exports.getRoom = async (inviteCode) => {
  return await redis.hgetall(`room:${inviteCode}`);
};

/**
 * Adds a username to the room's unique member set.
 */
exports.addMember = async (inviteCode, username) => {
  await redis.sadd(`room:${inviteCode}:members`, username);
};

/**
 * Removes a username from the room's member set.
 */
exports.removeMember = async (inviteCode, username) => {
  await redis.srem(`room:${inviteCode}:members`, username);
};

/**
 * Returns an array of all unique members currently in the room.
 */
exports.getMembers = async (inviteCode) => {
  return await redis.smembers(`room:${inviteCode}:members`);
};

/**
 * Pushes a new message object to the end of the room's message list.
 */
exports.addMessage = async (inviteCode, message) => {
  const key = `room:${inviteCode}:messages`;
  
  await redis.rpush(key, JSON.stringify(message));
  
  // Optional: Keep only the last 200 messages to manage Redis memory
  await redis.ltrim(key, -200, -1);
};

/**
 * Retrieves all messages for a room and parses them back into objects.
 */
exports.getMessages = async (inviteCode) => {
  const messages = await redis.lrange(
    `room:${inviteCode}:messages`,
    0,
    -1
  );
  return messages.map((m) => JSON.parse(m));
};

/**
 * Updates a specific message (e.g., adding a reaction) by finding its ID in the list.
 */
exports.updateMessage = async (inviteCode, msgId, updates) => {
  const key = `room:${inviteCode}:messages`;
  
  // 1. Fetch the current message list
  const messagesRaw = await redis.lrange(key, 0, -1);
  
  // 2. Iterate to find the correct message index
  for (let i = 0; i < messagesRaw.length; i++) {
    const msg = JSON.parse(messagesRaw[i]);
    
    if (msg.id === msgId) {
      // Merge existing message data with new updates (like the reactions array)
      const updatedMsg = { ...msg, ...updates };
      
      // 3. Use LSET to update only that specific index in Redis
      await redis.lset(key, i, JSON.stringify(updatedMsg));
      return updatedMsg;
    }
  }
  return null;
};

/**
 * Completely wipes the message history for a specific room.
 */
exports.clearChat = async (inviteCode) => {
  await redis.del(`room:${inviteCode}:messages`);
};