# Full Stack Monorepo with Turbopack, Eslint, Next.js, Express.js, Tailwind CSS, and shadcn

This repository is a full-stack monorepo starter template that integrates several modern web development tools and libraries, including **Turbopack**, **Eslint**, **Next.js**, **Express.js**, **Tailwind CSS**, and **shadcn**. It follows the tutorial from [The Halftime Code](https://www.thehalftimecode.com/building-a-full-stack-monorepo-with-turbopack-biome-next-js-express-js-tailwind-css-and-shadcn/) on how to set up a full-stack monorepo, combining both frontend and backend services in a single codebase.

## Features

- **Monorepo Architecture**: Organizes both frontend (Next.js) and backend (Express.js) in a single repository using Turbopack to manage and optimize builds.
- **Next.js**: A powerful React framework for building server-rendered web applications with API routes.
- **Express.js**: A minimalist Node.js framework for building backend services and REST APIs.
- **Turbopack**: A fast incremental bundler and build system, ideal for monorepo setups.
- **Tailwind CSS**: A utility-first CSS framework for building responsive, modern UI components.
- **shadcn**: A component library that integrates seamlessly with Tailwind CSS, providing elegant UI components.
- **ESLint**: A fast and versatile tool for linting, formatting, and ensuring code quality across the entire monorepo.

## Project Structure

The monorepo is organized as follows:

```
/apps
  /web (Next.js)
  /server (Express.js)

/packages
  /ui (shadcn component library with Tailwind CSS)
  /tsconfig (Shared configuration files such as Eslint, Tailwind, and Turbopack)
  /types (Shared types)
  /ui (Shared UI components and styles)
  /utils (Shared util methods)
```

- **/apps/web**: Contains the Next.js application responsible for the frontend.
- **/apps/server**: Contains the Express.js application responsible for the backend.
- **/packages/tsconfig**: Contains shared configurations (e.g., Eslint, Tailwind, Turbopack) to enforce consistency across the monorepo.
- **/packages/eslint-config**: Contains shared Eslint configurations for the monorepo.
- **/packages/types**: Contains shared types (e.g. responses, api clients, etc).
- **/packages/ui**: Houses the shared UI components built with shadcn and Tailwind CSS.
- **/packages/utils**: Contains shared utils methods that will be used in multiple apps or packages.

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/ivesfurtado/next-express-turborepo.git
   cd next-express-turborepo
   ```

2. **Install Dependencies**

   Use `pnpm` package manager:

   ```bash
   pnpm install
   ```

3. **Run the Development Server**

   You can start both the web and server services with Turbopack's parallelism:

   ```bash
   pnpm dev
   ```

   - Frontend is served at `http://localhost:3000` (Next.js)
   - Backend is served at `http://localhost:3001` (Express.js)

4. **Build for Production**

   To build the frontend and backend for production, run:

   ```bash
   pnpm build
   ```

   This will create optimized builds for both the frontend and backend services.

## Tools and Technologies

- **Next.js**: Provides the frontend framework with server-side rendering, API routes, and static generation.
- **Express.js**: Handles the backend, including API endpoints and server logic.
- **Turbopack**: Ensures fast builds and optimal performance for monorepos.
- **Tailwind CSS**: Simplifies styling with a utility-first approach.
- **shadcn**: Offers pre-designed components for building clean and modern UIs.
- **ESLint**: Enforces code standards by handling linting and formatting across the project.

## Deployment

You can deploy your full-stack monorepo using platforms like Vercel for the frontend and any Node.js hosting service for the backend (e.g., Heroku, AWS, DigitalOcean).

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have suggestions or improvements.

## License

This project is licensed under the MIT License. Feel free to use and modify it according to your needs.

---

## Example Applications

This monorepo structure has been successfully used to build:

- **[SnipLLM](https://www.snipllm.com/)** - An AI-powered writing tool that transforms your writing with advanced AI. No expertise needed: just paste any text, choose your goal, and get perfect results instantly.

## Further Reading

For further details on building and setting up this monorepo, check out the original tutorial on [The Halftime Code](https://www.thehalftimecode.com/building-a-full-stack-monorepo-with-turbopack-biome-next-js-express-js-tailwind-css-and-shadcn/).
