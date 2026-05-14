import { Container } from "@/components/layout/Container"

export default function NotFound() {
  return (
    <Container>
      <h1>404 Not Found</h1>
      <img
        src="/svg/not-found.svg"
        alt="Illustration of a 404 error"
        className="illustration"
      />
    </Container>
  )
}
