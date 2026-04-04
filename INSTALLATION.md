# Installation and Run Guide

This project is a full-stack e-commerce app with:
- Frontend: React
- Backend: Node.js + Express
- Database: MongoDB
- AI chat model: Ollama (`ecommerce-assistant:latest`)

## 1. Prerequisites

Install these on the other PC:
- Node.js 18+ and npm
- Ollama


## 2. Install backend dependencies

Open a terminal in `my-app/backend` and run:

```bash
npm install
```

Then start the backend:

```bash
npm start
```

The backend runs on port `5000` by default.

## 5. Install frontend dependencies

Open another terminal in `my-app/frontend` and run:

```bash
npm install
```

Then start the frontend:

```bash
npm start
```

The frontend runs on port `3000` by default.

## 6. Set up Ollama on the other PC

Install Ollama first, then pull the base model:

```bash
ollama pull llama3.2
```

If you want the custom ecommerce model used by this app, create it from the repo `Modelfile`:

```bash
ollama create ecommerce-assistant -f Modelfile
```

Verify the model exists:

```bash
ollama list
```

You should see:
- `ecommerce-assistant:latest`

## 7. Run the app

You need all three services running:
- MongoDB
- Backend: `http://localhost:5000`
- Frontend: `http://localhost:3000`
- Ollama: `http://localhost:11434`

Recommended order:
1. Start Ollama
2. Start backend
3. Start frontend
4. Open the browser at `http://localhost:3000`


## 9. Common issues

### CORS error
- Make sure the backend is running on port `5000`
- Make sure the frontend is using `http://localhost:3000`
- If you use another frontend port, update the backend CORS settings in `my-app/backend/server.js`

### Chatbot returns errors
- Check that Ollama is running
- Check that the model name exists in `ollama list`
- Check that the backend can reach `http://localhost:11434`

### Database connection failed
- Check your MongoDB URI in `my-app/backend/db.js`
- Make sure the new PC can access the MongoDB server

### Frontend cannot load data
- Confirm the backend is running
- Confirm the backend API is reachable at `http://localhost:5000/api/...`

## 10. Quick run summary

In short:

```bash
# backend
cd my-app/backend
npm install
npm start

# frontend
cd my-app/frontend
npm install
npm start

# ollama
ollama pull llama3.2
ollama create ecommerce-assistant -f Modelfile
ollama list
```


