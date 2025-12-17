# Recap

Recap is a lightweight, open-source tool for building **structured references with AI assistance**.

It is designed to help organize and consolidate information into clear, reliable formats—particularly in contexts where precision, structure, and recall are important.

---

## Overview

In many learning and review scenarios, understanding concepts is not the primary challenge.  
The difficulty often lies in retaining and recalling specific details—such as exact syntax, parameters, or lesser-used constructs—that do not consistently surface through routine use.

Recap supports this stage of preparation by assisting in the creation of structured reference entries.  
AI is used to help with initial structuring, while users retain full control over review, refinement, and organization.

The tool is intentionally minimal. It does not aim to replace practice, exploration, or primary learning, but to complement them by making structured reference-building more efficient.

---

## Usage Model

Recap follows a **local-first, bring-your-own-backend (BYOB)** approach.

### Guest Mode (Default)

- Recap can be used immediately without any setup.
- All data is stored locally in the browser.
- No account, backend, or API key is required.

This mode is intended for lightweight use, exploration, or short-term reference building.

### Cloud Mode (Optional)

- Users may connect their own **Supabase** instance to persist data.
- This enables backup and access across sessions or devices.
- All data remains under the user’s control.

### AI Assistance (Optional)

- AI features are disabled by default.
- Users can enable AI assistance by providing their own **Gemini API key**.
- Recap does not provide or manage AI credentials on behalf of users.

Both cloud storage and AI assistance are entirely optional.  
The application remains fully functional without either.

---

## How It Works

1. **Provide an entry name**  
   Enter the name of a function, concept, or item to document.

2. **AI-assisted structuring (optional)**  
   If enabled, AI helps generate a clean, structured reference entry.

3. **Review and refine**  
   Edit, reorganize, or expand the entry to match your preferred level of detail and understanding.

All entries remain fully editable and user-owned.

---

## Design Philosophy

Recap is guided by a small set of principles:

- **Structure supports recall**  
  Well-organized information is easier to revisit and retain.

- **Assistance, not automation**  
  AI reduces repetitive work, but understanding remains the user’s responsibility.

- **Local-first by default**  
  The application works without accounts, servers, or external dependencies.

- **User control**  
  Storage, AI usage, and persistence are opt-in and user-managed.

- **Minimal surface area**  
  Recap is designed for deliberate use, not continuous engagement.

---

## When Recap Is Useful

Recap can be useful when:

- information benefits from consistent structure
- precise details need to be consolidated or reviewed
- reference material must be revisited over time
- clarity and organization matter more than exploration

The tool does not prescribe when or how it should be used; its value depends on context.

---

## Setup & Installation

Recap requires no installation or environment setup for standard use.

### Option 1: Use the Hosted Version (Easiest)

- Open the hosted GitHub Pages deployment.
- Start using Recap immediately in Guest Mode.
- Optionally enable Cloud Mode or AI assistance via the in-app configuration panel.

No cloning, environment variables, or build steps are required.

### Option 2: Clone and Run Locally (Optional)

Cloning the repository is optional and intended for users who want to inspect, modify, or extend the codebase.

```
git clone https://github.com/jain-arham-hsr/recap.git
cd recap
npm install
npm run dev
```

## License

Recap is open source and released under a **non-commercial license**.

You are free to:

- use the application
- study the source code
- modify it for personal or educational purposes
- build on top of it for non-commercial use

Commercial use, redistribution, or monetization of Recap or derivative works is **not permitted** unless explicitly authorized.

See the `LICENSE` file for full details.
