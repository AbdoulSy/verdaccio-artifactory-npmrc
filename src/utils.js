// @flow

import crypto from 'crypto';
import crypt3 from './crypt3';
import md5 from 'apache-md5';
import * as locker from '@verdaccio/file-locking';

// this function neither unlocks file nor closes it
// it'll have to be done manually later
export function lockAndRead(name: string, cb: Function): void {
  locker.readFile(name, {lock: true}, (err, res) => {
    if (err) {
      return cb(err);
    }
    return cb(null, res);
  });
}

// close and unlock file
export function unlockFile(name: string, cb: Function): void {
  locker.unlockFile(name, cb);
}

/**
 * parseHTPasswd - convert htpasswd lines to object.
 * @param {string} input
 * @returns {object}
 */
export function parseHTPasswd(input: string): Object {
  return input.split('\n').reduce((result, line) => {
    const args = line.split(':', 3);
    if (args.length > 1) result[args[0]] = args[1];
    return result;
  }, {});
}

/**
 * verifyPassword - matches password and it's hash.
 * @param {string} passwd
 * @param {string} hash
 * @returns {boolean}
 */
export function verifyPassword(passwd: string, hash: string): boolean {
  if (hash.indexOf('{PLAIN}') === 0) {
    return passwd === hash.substr(7);
  } else if (hash.indexOf('{SHA}') === 0) {
    return (
      crypto
        .createHash('sha1')
        .update(passwd, 'binary')
        .digest('base64') === hash.substr(5)
    );
  }
  // for backwards compatibility, first check md5 then check crypt3
  return (md5(passwd, hash) === hash || crypt3(passwd, hash) === hash);
}

/**
 * addUserToHTPasswd - add users to .htpasswd file.
 * @param {*} body
 * @param {*} user
 * @param {*} passwd
 */
export function addUserToHTPasswd(body: string, user: string, passwd: string): string {
  if (user !== encodeURIComponent(user)) {
    let err = Error('username should not contain non-uri-safe characters');
    err.status = 409;
    throw err;
  }

  if (crypt3) {
    passwd = crypt3(passwd);
  } else {
    passwd =
      '{SHA}' +
      crypto
        .createHash('sha1')
        .update(passwd, 'binary')
        .digest('base64');
  }
  let comment = 'autocreated ' + new Date().toJSON();

  let newline = `${user}:${passwd}:${comment}\n`;
  if (body.length && body[body.length - 1] !== '\n') {
      newline = '\n' + newline;
  }
  return body + newline;
}
