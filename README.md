# koa-openid-connect
OpenID Connect Middleware for use with Koa

## Getting Started
Install with npm:
```bash
npm i koa-openid-connect --save
```

Require in your Node-Koa server.js file:

```javascript
const KoaOpenIdConnect = require('koa-openid-connect')
```

Define an openid const:
```javascript
const openid = new KoaOpenIdConnect(defaultConfig, openidConfig)
```

Call inside your home route:
```javascript
homeRoute.get('/', async function (ctx, next) {
	if (true) {
		return await openid.goLogin(ctx)
	}
}) 
```

See full example below:

## Example
Create .env file in your root directory with the following config variables
```bash
# Node Evironment
NODE_ENV=development

# Koa OpenID Default Config Variables
URI_BASE=https://mydomain.example.com/openId

URI_AUTH=https://mydomain.example.com/openId/authenticate

URI_TOKEN=https://mydomain.example.com/openId/token

URI_USERINFO=https://mydomain.example.com/openId/userinfo

URI_LOGOUT=https://mydomain.example.com/openId/logout

SCOPE="openid profile email"

# Koa OpenID Config Variables
CLIENT_ID="<your_client_id>"

CLIENT_SECRET="<your_client_secret>"

URI_REDIRECT=https://mydomain.example.com/openId/redirect
```

Node-Koa server.js
```javascript
require('dotenv').config()

const Koa = require('koa')
const Router = require('koa-router')
const combineRouters = require('koa-combine-routers')
const logger = require('koa-logger')
const cors = require('kcors')
const bodyParser = require('koa-bodyparser')
const _log = require('ololog').configure({locate: false})

const KoaOpenIdConnect = require('koa-openid-connect')

const app = new Koa()

const defaultConfig = {
	base_uri: process.env.URI_BASE,
	authorize_uri: process.env.URI_AUTH,
	token_uri: process.env.URI_TOKEN,
	userinfo_uri: process.env.URI_USERINFO,
	scope: process.env.SCOPE
}

const openidConfig = {
	client_id: process.env.CLIENT_ID,
	client_secret: process.env.CLIENT_SECRET,
	redirect_uri: process.env.URI_REDIRECT
}

const openid = new KoaOpenIdConnect(defaultConfig, openidConfig)

const homeRoute = new Router()
const loginRoute = new Router()
const registerRoute = new Router()

homeRoute.get('/', async function (ctx, next) {
	if (true) {
		return await openid.goLogin(ctx)
	}
})

loginRoute.get('/login', async function (ctx, next) {
	return await openid.getUserInfo(ctx, next, function (result) {
		if (!result.error) {
			_log.lightCyan(result.userInfo)
		} else {
			let loginMsg = 'You must register at https://example.com/register'
			_log.red('loginMsg: ', loginMsg)
			// redirect to '/register'
		}
	})
})

registerRoute.get('/register', async function (ctx,  next) {
	// register user
})

const router = combineRouters(
	homeRoute,
	loginRoute,
	registerRoute
)

app.use(cors())
app.use(logger())
app.use(bodyParser())
app.use(router())

app.listen(6001, () => _log.blue(`Server listening on port ${6001}`))
```

When you start the app and navigate to http://localhost:6001 the `KoaOpenIdConnect` checks if you are already authenticated and redirects you the `URI_REDIRECT` you specified in the `.env` file 