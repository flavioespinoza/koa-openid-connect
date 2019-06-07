/**
 * AuthNet OpenID Middleware
 */
require('dotenv').config()

const fetch = require('node-fetch');
const jwt = require('jwt-simple');
const _log = require('ololog').configure({locate: false})

function str2base64(str) {
	return new Buffer(str).toString('base64');
}

async function fetchToken(code, config) {
	const url = config.token_uri;
	const params = `grant_type=authorization_code&code=${code}&redirect_uri=${config.redirect_uri}`;
	const authorization = `${config.client_id}:${config.client_secret}`;
	const authorizationBase64 = str2base64(authorization);
	const headers = {
		'Content-Type': 'application/x-www-form-urlencoded',
		'Authorization': `Basic ${authorizationBase64}`
	};
	const res = await fetch(url, {
		method: 'POST',
		body: params,
		headers: headers
	})
		.then(res => res.json());
	return res;
}

function checkIdToken(id_token, config) {
	const result = jwt.decode(id_token, config.client_secret, false, 'HS256');
	if (result.iss !== config.base_uri) return false;
	if (result.aud.indexOf(config.client_id) < 0) return false;
	// if(result.exp < Date.now()) return false;
	return true;
}

async function fetchUserInfo(url, access_token) {
	const headers = {
		Authorization: `Bearer ${access_token}`
	};
	const res = await fetch(url, {
		method: 'GET',
		headers: headers
	});
	const resJson = await res.json();
	return resJson;
}

class KoaOpenIdConnect {
	constructor(defaultConfig, config) {

		// Authority OpenID default config variables
		if (!defaultConfig.base_uri) {
			_log.red('KoaOpenID: base_uri is required')
		}
		if (!defaultConfig.authorize_uri) {
			_log.red('KoaOpenID: authorize_uri is required')
		}
		if (!defaultConfig.token_uri) {
			_log.red('KoaOpenID: token_uri is required')
		}
		if (!defaultConfig.userinfo_uri) {
			_log.red('KoaOpenID: userinfo_uri is required')
		}
		if (!defaultConfig.scope) {
			_log.red('KoaOpenID: scope is required')
		}

		// Authority OpenID client config variables and redirect uri
		if (!config.client_id) {
			_log.red('KoaOpenID: client_id is required')
		}
		if (!config.client_secret) {
			_log.red('KoaOpenID: client_secret is required')
		}
		if (!config.redirect_uri) {
			_log.red('KoaOpenID: redirect_uri is required')
		}
		this.config = Object.assign({}, defaultConfig, config)
	}
	
	getLoginURL() {
		const params = {
			response_type: 'code',
			scope: this.config.scope,
			client_id: this.config.client_id,
			redirect_uri: this.config.redirect_uri
		};
		const paramsStr = Object.entries(params).map(arr => `${arr[0]}=${arr[1]}`).join('&');
		return `${this.config.authorize_uri}?${paramsStr}`;
	}

	async goLogin(ctx, next) {
		return ctx.redirect(this.getLoginURL())
	}

	getRegisterURL() {
		//TODO: getRegisterURL from Resilient
	}

	async goRegister(ctx, next) {
		return ctx.redirect(this.getRegisterURL())
	}

	async getUserInfo(ctx, cb) {
		const code = ctx.query.code;
		let nextParams = {};
		if (ctx.query.error) {
			nextParams = {
				error: ctx.query.error,
				error_description: ctx.query.err
			}
		} else {
			const json = await fetchToken(code, this.config);
			const result = checkIdToken(json.id_token, this.config);
			if (result) {
				const userInfo = await fetchUserInfo(this.config.userinfo_uri, json.access_token);
				nextParams = {
					error: '',
					userInfo
				};
			} else {
				nextParams = {
					error: 'id_token is invalid',
					error_description: 'id_token is invalid'
				}
			}
		}
		typeof cb === 'function' && cb.call(ctx, nextParams)
		return nextParams
	}
}

module.exports = KoaOpenIdConnect