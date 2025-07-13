### 🔄 Project Awareness & Context
- **Always read `PLANNING.md`** at the start of a new conversation to understand the project's architecture, goals, style, and constraints.
- **Check `TASK.md`** before starting a new task. If the task isn't listed, add it with a brief description and today's date.
- **Use consistent naming conventions, file structure, and architecture patterns** as described in `PLANNING.md`.
- **Use Node.js 22** and npm for package management and script execution.

### 🧱 Code Structure & Modularity
- **Never create a file longer than 500 lines of code.** If a file approaches this limit, refactor by splitting it into modules or helper files.
- **Organize code into clearly separated modules**, grouped by feature or responsibility.
  For React/Node.js projects this looks like:
    - `src/components/` - React components
    - `src/utils/` - Helper functions and utilities
    - `src/types/` - TypeScript type definitions
    - `src/api/` - API handlers and Lambda functions
- **Use clear, consistent ES6 imports** (prefer relative imports within the project).
- **Use dotenv** for environment variables with proper TypeScript typing.

### 🧪 Testing & Reliability
- **Always create Jest or Vitest unit tests for new features** (functions, components, API endpoints, etc).
- **After updating any logic**, check whether existing unit tests need to be updated. If so, do it.
- **Tests should live in a `__tests__` or `tests/` folder** mirroring the main app structure.
  - Include at least:
    - 1 test for expected use
    - 1 edge case
    - 1 failure case

### ✅ Task Completion
- **Mark completed tasks in `TASK.md`** immediately after finishing them.
- Add new sub-tasks or TODOs discovered during development to `TASK.md` under a “Discovered During Work” section.

### 📎 Style & Conventions
- **Use TypeScript** as the primary language for both frontend and backend.
- **Follow ESLint rules**, use strict TypeScript types, and format with Prettier.
- **Use Zod for data validation** and schema definition.
- Use React 19 for frontend, AWS Lambda for serverless functions, and Express if needed for APIs.
- Write **JSDoc comments for every function** using the standard format:
  ```typescript
  /**
   * Brief summary.
   * 
   * @param param1 - Description of parameter
   * @returns Description of return value
   */
  function example(param1: string): ReturnType {
    // implementation
  }
  ```

### 📚 Documentation & Explainability
- **Update `README.md`** when new features are added, dependencies change, or setup steps are modified.
- **Comment non-obvious code** and ensure everything is understandable to a mid-level developer.
- When writing complex logic, **add an inline `// Reason:` comment** explaining the why, not just the what.

### 🧠 AI Behavior Rules
- **Never assume missing context. Ask questions if uncertain.**
- **Never hallucinate libraries or functions** – only use known, verified npm packages.
- **Always confirm file paths and module names** exist before referencing them in code or tests.
- **Never delete or overwrite existing code** unless explicitly instructed to or if part of a task from `TASK.md`.