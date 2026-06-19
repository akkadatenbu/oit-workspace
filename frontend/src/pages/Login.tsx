const googleAuthUrl = import.meta.env.DEV
  ? 'http://localhost:5525/api/auth/google'
  : '/api/auth/google';

const Login = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Background ambient glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <h2 className="mt-6 text-center text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-500">
          OIT WorkSpace
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Intelligent Task & Project Management
        </p>
      </div>

      <div className="mt-8 w-full max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl py-10 px-4 shadow-xl dark:shadow-2xl dark:shadow-black/50 sm:rounded-2xl sm:px-10 border border-gray-200 dark:border-white/5 transition-all duration-300 hover:border-gray-300 dark:hover:border-white/10">
          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Welcome Back</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Sign in with your university Google account to continue to your workspace.
              </p>
            </div>
            
            <a
              href={googleAuthUrl}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-[#0a0a0a] transition-all duration-300 hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 mr-3 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
