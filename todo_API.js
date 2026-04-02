const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

const databasePath = path.join(__dirname, 'todoApplication.db')
let database = null

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running At http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB ERROR : ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

app.get('/todos/', async (request, response) => {
  const {priority, status, search_q} = request.query

  let getTodosQuery = ''
  let scenario = ''

  if (status !== undefined && priority !== undefined) {
    scenario = 'STATUS_PRIORITY'
  } else if (status !== undefined) {
    scenario = 'STATUS'
  } else if (priority !== undefined) {
    scenario = 'PRIORITY'
  } else if (search_q !== undefined) {
    scenario = 'SEARCH'
  }

  switch (scenario) {
    case 'STATUS_PRIORITY':
      getTodosQuery = `
                SELECT *
                FROM todo
                WHERE status = '${status}'
                AND priority = '${priority}';
            `
      break

    case 'STATUS':
      getTodosQuery = `
                SELECT *
                FROM todo
                WHERE status = '${status}';
            `
      break

    case 'PRIORITY':
      getTodosQuery = `
                SELECT *
                FROM todo
                WHERE priority = '${priority}';
            `
      break

    case 'SEARCH':
      getTodosQuery = `
                SELECT *
                FROM todo
                WHERE todo LIKE '%${search_q}%';
            `
      break

    default:
      getTodosQuery = `SELECT * FROM todo;`
  }

  const todosArray = await database.all(getTodosQuery)
  response.send(todosArray)
})

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const getTodoQuery = `
    SELECT *
    FROM todo
    WHERE 
    id = ${todoId};
  `
  const todo = await database.get(getTodoQuery)
  response.send(todo)
})

app.post('/todos/', async (request, response) => {
  const todoDetails = request.body
  const {id, todo, priority, status} = todoDetails
  const addTodoQuery = `
    INSERT INTO 
    todo(id,todo , priority, status)
    VALUES (
      ${id},
      '${todo}',
      '${priority}',
      '${status}'
    );`
  await database.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const todoDetails = request.body
  const {todo, priority, status} = todoDetails

  let updateTodoQuery = ''
  let scenario = ''
  let message = ''

  if (status !== undefined) {
    scenario = 'STATUS'
  } else if (priority !== undefined) {
    scenario = 'PRIORITY'
  } else if (todo !== undefined) {
    scenario = 'TODO'
  }

  switch (scenario) {
    case 'STATUS':
      updateTodoQuery = `
          UPDATE todo
          SET 
          status = '${status}'
          WHERE 
           id = ${todoId};
        `
      message = 'Status Updated'
      break
    case 'PRIORITY':
      updateTodoQuery = `
          UPDATE todo
          SET 
          priority = '${priority}'
          WHERE 
           id = ${todoId};
        `
      message = 'Priority Updated'
      break
    case 'TODO':
      updateTodoQuery = `
          UPDATE todo
          SET 
          todo = '${todo}'
          WHERE 
           id = ${todoId};
        `
      message = 'Todo Updated'
      break
  }
  await database.run(updateTodoQuery)
  response.send(message)
})

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const deleteQuery = `
    DELETE FROM todo
    WHERE id = ${todoId};
  `

  await database.run(deleteQuery)
  response.send('Todo Deleted')
})

module.exports = app
