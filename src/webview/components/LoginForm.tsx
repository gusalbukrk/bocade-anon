import React, { useEffect, useState } from 'react';

const LoginForm = ({
  vscode,
}: {
  vscode: ReturnType<typeof acquireVsCodeApi>;
}) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    window.addEventListener('message', (event) => {
      const message = event.data as { command: string };
      if (message.command === 'login-finished') {
        setIsLoggingIn(false);
      }
    });
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsLoggingIn(true);

    const get = (name: string) =>
      (event.currentTarget.elements.namedItem(name) as HTMLInputElement).value;

    const credentials = {
      ip: get('ip'),
      username: get('username'),
      password: get('password'),
    };

    if (Object.values(credentials).every((c) => c !== '')) {
      vscode.postMessage({
        command: 'login',
        credentials,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="ip">IP:</label>
      <input type="text" id="ip" name="ip" />
      <label htmlFor="username">Username:</label>
      <input type="text" id="username" name="username" />
      <label htmlFor="password">Password:</label>
      <input type="password" id="password" name="password" />
      <input type="submit" value="Log in" disabled={isLoggingIn} />
    </form>
  );
};

export default LoginForm;
