import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-10">
      <SignIn />
    </section>
  );
}
