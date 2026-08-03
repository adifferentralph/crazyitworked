import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <section className="container-page grid min-h-[70vh] place-items-center py-10">
      <SignUp />
    </section>
  );
}
