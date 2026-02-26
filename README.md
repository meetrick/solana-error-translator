# Solana Error Translator

A locally-run web application that takes a failed Solana transaction signature and returns a plain-English explanation of what went wrong.

Because the tool runs entirely on your own machine, **your transaction signatures never leave your computer** — no third-party analytics, no shared servers, and no RPC rate limits imposed by a hosted service.

---

## How It Works

```
[Browser]  →  paste signature  →  [Next.js Frontend :3000]
                                         │
                                   POST /api/analyze
                                         │
                                  [FastAPI Backend :8000]
                                         │
                               getTransaction(signature)
                                         │
                               [Your Solana RPC Node]
                                         │
                              parse logs + look up errors.json
                                         │
                                   ← JSON result
                                         │
                             [Human-readable explanation]
```

1. You paste a transaction signature into the browser.
2. The frontend sends it to a FastAPI server running on your machine.
3. The backend fetches the transaction from your chosen Solana RPC endpoint.
4. It parses the transaction logs, extracts the error code, and looks it up in a local dictionary (`errors.json`).
5. A clear explanation is displayed in the browser.

---

## Prerequisites

Make sure the following are installed before you begin:

| Tool | Minimum version | Check |
|---|---|---|
| **Node.js** | 18.x | `node --version` |
| **npm** | 9.x | `npm --version` |
| **Python** | 3.10 | `python3 --version` |
| **pip** | bundled with Python | `pip --version` |

---

## Installation & Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/meetrick/solana-error-translator.git
cd solana-error-translator
```

---

### Step 2 — Backend Setup

```bash
# Navigate into the backend directory
cd backend

# Create a Python virtual environment
python3 -m venv venv

# Activate the virtual environment
# macOS / Linux:
source venv/bin/activate
# Windows (Command Prompt):
venv\Scripts\activate.bat
# Windows (PowerShell):
venv\Scripts\Activate.ps1

# Install Python dependencies
pip install -r requirements.txt
```

#### Configure your Solana RPC URL

The backend needs a Solana RPC endpoint to fetch transaction data.

```bash
# Copy the example environment file
cp .env.example .env
```

Open the newly created `.env` file in any text editor and replace the placeholder with your own RPC URL:

```dotenv
# .env
SOLANA_RPC_URL=https://your-rpc-endpoint-here
```

> **Where to get an RPC URL**
>
> - **Free public endpoint** (rate-limited): `https://api.mainnet-beta.solana.com`
> - **Private endpoints** (recommended for heavy use): [Helius](https://helius.dev), [QuickNode](https://quicknode.com), or [Alchemy](https://alchemy.com)

---

### Step 3 — Frontend Setup

```bash
# From the project root, navigate into the frontend directory
cd ../frontend

# Install Node.js dependencies
npm install
```

---

## Running the Application

You will need **two terminal windows** open at the same time.

### Terminal 1 — Start the Backend

```bash
cd backend

# Activate your virtual environment (if not already active)
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate.bat     # Windows

# Start the FastAPI server
uvicorn app.main:app --reload
```

The backend will be available at **http://localhost:8000**.
You can also explore the auto-generated API docs at **http://localhost:8000/docs**.

### Terminal 2 — Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at **http://localhost:3000**.

---

## Usage

1. Open **http://localhost:3000** in your browser.
2. Paste a Solana transaction signature into the input field.
3. Click **Analyze Transaction**.
4. Read the plain-English explanation of the error.

---

## Project Structure

```
solana-error-translator/
├── backend/
│   ├── app/
│   │   ├── __init__.py      # Python package marker
│   │   ├── main.py          # FastAPI routes and analysis logic
│   │   └── services.py      # (reserved for future service helpers)
│   ├── .env.example         # Environment variable template
│   ├── errors.json          # Local dictionary of known program errors
│   └── requirements.txt     # Python dependencies
└── frontend/
    ├── app/
    │   ├── page.tsx         # Main UI page
    │   └── globals.css      # Global styles
    ├── components/
    │   └── ui/              # Reusable UI components
    └── ...                  # Next.js config, tsconfig, package.json
```

---

## Contributing

Contributions are very welcome! The most impactful way to help is to **expand `errors.json`** with error codes from more Solana programs.

### How to contribute

1. Fork the repository and create a new branch.
2. Make your changes (see ideas below).
3. Open a pull request with a clear description of what you added or fixed.

### Ideas for contributions

- Add error codes for more programs (e.g., Jupiter, Raydium, OpenBook, Marinade).
- Improve existing error messages to be clearer or more actionable.
- Add support for parsing non-custom program errors (e.g., system program errors).
- Report bugs or unexpected behavior by [opening an issue](https://github.com/meetrick/solana-error-translator/issues).

---

## License

MIT
