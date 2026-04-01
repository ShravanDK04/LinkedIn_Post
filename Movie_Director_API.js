const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()

app.use(express.json())

const databasePath = path.join(__dirname, 'moviesData.db')

let database = null

const convertMovieDbObjectToResponseObject = dbObject => ({
  movieId: dbObject.movie_id,
  directorId: dbObject.director_id,
  movieName: dbObject.movie_name,
  leadActor: dbObject.lead_actor,
})

const convertDirectorDbObjectToResponseObject = dbObject => ({
  directorId: dbObject.director_id,
  directorName: dbObject.director_name,
})

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/movies/46/')
    })
  } catch (e) {
    console.log(`DB Error : '${e.message}'`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.get('/movies/', async (request, response) => {
  const getMoviesQuery = `
        SELECT 
            movie_name AS movieName 
        FROM 
            movie;
    `
  const movieNamesArray = await database.all(getMoviesQuery)
  response.send(movieNamesArray)
})

app.post('/movies/', async (request, response) => {
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails
  const addMovieQuery = `
        INSERT INTO
            movie (director_id, movie_name, lead_actor) 
        VALUES
            (
                ${directorId},
                '${movieName}',
                '${leadActor}'
            );`
  await database.run(addMovieQuery)
  response.send('Movie Successfully Added')
})

app.get('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const getMovieQuery = `
        SELECT 
            *
        FROM 
            movie
        WHERE 
            movie_id = ${movieId};
    `
  const movie = await database.get(getMovieQuery)
  response.send(convertMovieDbObjectToResponseObject(movie))
})

app.put('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const movieDetails = request.body
  const {directorId, movieName, leadActor} = movieDetails
  const updateMovieQuery = `
        UPDATE
            movie
        SET 
            director_id = ${directorId},
            movie_name = '${movieName}',
            lead_actor = '${leadActor}'
        WHERE 
            movie_id = ${movieId};
    `
  await database.run(updateMovieQuery)
  response.send('Movie Details Updated')
})

app.delete('/movies/:movieId/', async (request, response) => {
  const {movieId} = request.params
  const deleteMovieQuery = `
        DELETE FROM
            movie
        WHERE 
            movie_id = ${movieId};
    `
  await database.run(deleteMovieQuery)
  response.send('Movie Removed')
})

app.get('/directors/', async (request, response) => {
  const getDirectorsQuery = `
        SELECT 
            *
        FROM 
            director
    `
  const directorArray = await database.all(getDirectorsQuery)
  response.send(directorArray.map(convertDirectorDbObjectToResponseObject))
})

app.get('/directors/:directorId/movies/', async (request, response) => {
  const {directorId} = request.params
  const getDirectorMoviesQuery = `
        SELECT 
            movie_name AS movieName
        FROM 
            movie
        WHERE director_id = ${directorId};
    `
  const moviesArray = await database.all(getDirectorMoviesQuery)
  response.send(moviesArray)
})

module.exports = app
