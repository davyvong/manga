export const changeMessageVisibilityScript =
  `local msg = redis.call("ZSCORE", KEYS[1], KEYS[2])
if not msg then
  return 0
end
redis.call("ZADD", KEYS[1], KEYS[3], KEYS[2])
return 1`;

export const popMessageScript =
  `local msg = redis.call("ZRANGEBYSCORE", KEYS[2], "-inf", KEYS[3], "LIMIT", "0", "1")
  if #msg == 0 then
    return nil
  end
  redis.call("HINCRBY", KEYS[1], "totalReceived", 1)
  local mbody = redis.call("HGET", KEYS[1], msg[1])
  local rc = redis.call("HINCRBY", KEYS[1], msg[1] .. ":rc", 1)
  local o = {msg[1], mbody, rc}
  if rc==1 then
    table.insert(o, KEYS[3])
  else
    local fr = redis.call("HGET", KEYS[1], msg[1] .. ":fr")
    table.insert(o, fr)
  end
  redis.call("ZREM", KEYS[2], msg[1])
  redis.call("HDEL", KEYS[1], msg[1], msg[1] .. ":rc", msg[1] .. ":fr")
  return o`;

export const receiveMessageScript =
  `local msg = redis.call("ZRANGEBYSCORE", KEYS[2], "-inf", KEYS[3], "LIMIT", "0", "1")
if #msg == 0 then
  return nil
end
redis.call("ZADD", KEYS[2], KEYS[4], msg[1])
redis.call("HINCRBY", KEYS[1], "totalReceived", 1)
local mbody = redis.call("HGET", KEYS[1], msg[1])
local rc = redis.call("HINCRBY", KEYS[1], msg[1] .. ":rc", 1)
local o = {msg[1], mbody, rc}
if rc==1 then
  redis.call("HSET", KEYS[1], msg[1] .. ":fr", KEYS[3])
  table.insert(o, KEYS[3])
else
  local fr = redis.call("HGET", KEYS[1], msg[1] .. ":fr")
  table.insert(o, fr)
end
return o
`;
