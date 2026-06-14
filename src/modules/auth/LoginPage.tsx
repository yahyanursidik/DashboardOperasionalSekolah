import React from "react";
import { useLogin } from "@refinedev/core";
import { BrandLogo } from "../../components/common/BrandLogo";

export const LoginPage: React.FC = () => {
  const { mutate: login, isLoading } = useLogin();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    login({ email, password });
  };

  return (
    <div className="w-full space-y-8 rounded-2xl bg-card text-card-foreground p-8 shadow-xl border">
      <div className="text-center flex flex-col items-center">
        <BrandLogo 
          logoClassName="max-h-20 w-auto object-contain mb-4" 
          textClassName="mt-2 text-3xl font-extrabold tracking-tight mb-2" 
        />
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your account
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email-address" className="sr-only">Email address</label>
            <input 
              id="email-address" 
              name="email" 
              type="email" 
              required 
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              placeholder="Email address" 
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
              placeholder="Password" 
            />
          </div>
        </div>
        <div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
};
