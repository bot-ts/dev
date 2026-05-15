import Image from "next/image"
import Link from "next/link"
import { LoggedInButton } from "@/components/auth/LoggedInButton"
import { ModeToggle } from "@/components/layout/ModeToggle"

export const Header = async () => {
  return (
    <header className="border-b border-border">
      <div className="container mx-auto flex items-center justify-between py-1">
        <div className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt="Website icon"
            width={32}
            height={32}
            className="rounded-xl mr-2"
          />
          <span>
            <span className="uppercase font-thin">Discord Bot Builder</span> -{" "}
            <span className="font-light">
              Using{" "}
              <Link href="https://ghom.gitbook.io/bot-ts" target="_blank">
                Bot.ts
              </Link>
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <LoggedInButton />
        </div>
      </div>
    </header>
  )
}
