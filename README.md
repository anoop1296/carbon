This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin Login Setup

The public pages remain open, while `/admin` and `/api/admin/*` are protected with Firebase login.

All app data is now stored in Firestore. The old CSV files are no longer served from `public`; they live in `data/csvSeed` only as private bootstrap data so the first server request can seed Firestore automatically when the collection is empty.

### Required environment variables

Copy `.env.example` into `.env.local` for local development, and add the same values in your Vercel project settings:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_EMAILS`

### Firebase setup

1. Create a Firebase project.
2. Enable `Authentication`.
3. Turn on the `Email/Password` sign-in provider.
4. Create your admin user in Firebase Authentication.
5. Generate a Firebase Admin SDK service account and copy its values into the server-side environment variables.
6. Enable Firestore in the same Firebase project.
7. Add one or more allowed admin emails in `ADMIN_EMAILS` as a comma-separated list.

### Data bootstrap

1. Keep the seed files in `data/csvSeed`.
2. On the first request for a dataset, the server checks Firestore first.
3. If a dataset is missing in Firestore, the matching seed CSV is imported once into the `csvFiles` collection.
4. After that, all dashboard and admin `GET`/`POST`/`PUT`/`DELETE` requests read and write Firestore data.

### Vercel setup

1. Open your Vercel project settings.
2. Add the environment variables above.
3. Redeploy the app.
4. Open `/admin/login` and sign in with the Firebase admin account.
5. The server bundle includes `data/csvSeed`, so Firestore can self-bootstrap without exposing those files publicly.
