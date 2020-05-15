module.exports.GamePhase = {
  NOT_STARTED: 'NOT_STARTED',
  ROLL: 'ROLL',
  LIST: 'LIST',
  VOTE: 'VOTE',
  SCORES: 'SCORES',
};

module.exports.RoomType = {
  REALTIME: Symbol('REALTIME'),
  ASYNC: Symbol('ASYNC'),
};

module.exports.RoomVisibility = {
  PUBLIC: Symbol('PUBLIC'),
  PRIVATE: Symbol('PRIVATE'),
};

module.exports.pushNotifServiceUrl = 'https://exp.host/--/api/v2/push/send';
