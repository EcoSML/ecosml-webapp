const env = process.env;
const path = require('path');
const secrets = require('../secrets');

module.exports = {

  server : {
    port : env.SERVER_PORT || '3000',
    url : env.SERVER_URL || 'http://localhost:3000',
    label : env.SERVER_LABEL || 'EcoSML', // used for auth redirect
    assets : env.SERVER_ASSET_DIR || 'public',
    loglevel : env.SERVER_LOG_LEVEL || 'info',

    jwt : {
      secret : env.JWT_SECRET || 'not set'
    },

    auth : {
      redirect : env.AUTH_REDIRECT || 'http://localhost:5000/user/remotelogin'
    },

    session : {
      maxAge : (86400 * 365), // ms - year
      secret : env.SESSION_SECRET || 'not set'
    },

    appRoutes : ['newpage']
  },

  mongodb : {
    url : 'mongodb://127.0.0.1:27017/ecosml',
    collections : {
      repos : 'repo'
    }
  },

  github : {
    access : secrets.github,
    org : 'ecosml',
    fsRoot : env.GITHUB_FS_ROOT || path.join(__dirname, '..', 'gitdata'),
    default_license : 'mit'
  }

}