const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const app = express()
app.use(express.json())

const databasePath = path.join(__dirname, 'covid19IndiaPortal.db')
let db = null

// 🔌 DB + Server
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// 🔐 LOGIN API
app.post('/login/', async (request, response) => {
  const {username, password} = request.body

  const selectUserQuery = `SELECT * FROM user WHERE username = ?;`
  const dbUser = await db.get(selectUserQuery, [username])

  if (dbUser === undefined) {
    response.status(400).send('Invalid user')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)

    if (!isPasswordMatched) {
      response.status(400).send('Invalid password')
    } else {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'SECRET_KEY')

      response.send({jwtToken})
    }
  }
})

// 🛡️ AUTH MIDDLEWARE
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']

  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }

  if (jwtToken === undefined) {
    response.status(401).send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'SECRET_KEY', (error, payload) => {
      if (error) {
        response.status(401).send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

// 🌍 API 2 → GET ALL STATES
app.get('/states/', authenticateToken, async (request, response) => {
  const query = `SELECT * FROM state;`
  const states = await db.all(query)

  const result = states.map(each => ({
    stateId: each.state_id,
    stateName: each.state_name,
    population: each.population,
  }))

  response.send(result)
})

// 📍 API 3 → GET STATE BY ID
app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params

  const query = `SELECT * FROM state WHERE state_id = ?;`
  const state = await db.get(query, [stateId])

  response.send({
    stateId: state.state_id,
    stateName: state.state_name,
    population: state.population,
  })
})

// 🏙️ API 4 → ADD DISTRICT
app.post('/districts/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body

  const query = `
    INSERT INTO district (district_name, state_id, cases, cured, active, deaths)
    VALUES (?, ?, ?, ?, ?, ?);
  `

  await db.run(query, [districtName, stateId, cases, cured, active, deaths])

  response.send('District Successfully Added')
})

// 🔍 API 5 → GET DISTRICT
app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params

    const query = `SELECT * FROM district WHERE district_id = ?;`
    const d = await db.get(query, [districtId])

    response.send({
      districtId: d.district_id,
      districtName: d.district_name,
      stateId: d.state_id,
      cases: d.cases,
      cured: d.cured,
      active: d.active,
      deaths: d.deaths,
    })
  },
)

// ❌ API 6 → DELETE DISTRICT
app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params

    const query = `DELETE FROM district WHERE district_id = ?;`
    await db.run(query, [districtId])

    response.send('District Removed')
  },
)

// 🔄 API 7 → UPDATE DISTRICT
app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body

    const query = `
    UPDATE district
    SET district_name = ?, state_id = ?, cases = ?, cured = ?, active = ?, deaths = ?
    WHERE district_id = ?;
  `

    await db.run(query, [
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
      districtId,
    ])

    response.send('District Details Updated')
  },
)

// 📊 API 8 → STATE STATS
app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params

    const query = `
    SELECT 
      SUM(cases) as totalCases,
      SUM(cured) as totalCured,
      SUM(active) as totalActive,
      SUM(deaths) as totalDeaths
    FROM district
    WHERE state_id = ?;
  `

    const stats = await db.get(query, [stateId])

    response.send(stats)
  },
)

// 📤 EXPORT
module.exports = app
