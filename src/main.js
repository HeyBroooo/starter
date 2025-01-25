import { Client, Users } from 'node-appwrite';

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }) => {
  // Initialize Appwrite SDK client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT) // Appwrite API endpoint
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)    // Appwrite project ID
    .setKey(req.headers['x-appwrite-key'] ?? '');            // Appwrite API key from headers

  const users = new Users(client);

  try {
    // Fetch the list of users
    const response = await users.list();

    // Filter the list of users to include only authenticated users
    // Here, we're assuming "emailVerification" indicates authentication status.
    const authenticatedUsers = response.users.filter(user => user.emailVerification);

    // Log the total number of authenticated users
    log(`Total authenticated users: ${authenticatedUsers.length}`);

    // Respond with the filtered user list in JSON format
    return res.json({
      total: authenticatedUsers.length,
      users: authenticatedUsers.map(user => ({
        id: user.$id,
        name: user.name,
        email: user.email,
        emailVerification: user.emailVerification
      }))
    });
  } catch (err) {
    // Log error to Appwrite console
    error("Could not fetch users: " + err.message);

    // Respond with an error status
    return res.json({ error: "Failed to fetch users", message: err.message }, 500);
  }
};
