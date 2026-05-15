"use client"

import type { User } from "@prisma/client"
import { useMutation } from "@tanstack/react-query"
import { RocketIcon } from "lucide-react"
import Link from "next/link"
import React from "react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useZodForm,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { submitBot } from "./builder.action"
import { type BuilderValues, builderSchema } from "./builder.schema"
import { ReviewForm } from "./review.form"

type BuilderFormProps = {
  user: User
  currentProgress?: number
  currentValues?: BuilderValues
}

export const BuilderForm = (props: BuilderFormProps) => {
  const [api, setApi] = React.useState<CarouselApi>()
  const [stepCount, setStepCount] = React.useState(0)
  const [step, setStep] = React.useState(0)
  const [botCreated, setBotCreated] = React.useState(false)
  const form = useZodForm({
    schema: builderSchema,
    defaultValues: props.currentValues,
  })

  const bypass = true

  const mutation = useMutation({
    mutationFn: async (values: BuilderValues) => {
      const { data, serverError } = await submitBot(values)

      if (serverError || !data) {
        toast.error(serverError)
        return
      }

      toast.success("Bot created successfully")
    },
  })

  React.useEffect(() => {
    if (!api) {
      return
    }

    setStepCount(api.scrollSnapList().length)
    setStep(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setStep(api.selectedScrollSnap() + 1)
    })
  }, [api])

  const validateBaseSettings = (): boolean => {
    // bot name, bot description, bot prefix, bot avatar and banner
    try {
      const values = form.getValues()
      builderSchema.shape.name.parse(values.name)
      builderSchema.shape.description.parse(values.description)
      builderSchema.shape.prefix.parse(values.prefix)
      builderSchema.shape.token.parse(values.token)
    } catch (e: any) {
      return false
    }
    return true
  }

  const validateAdvancedSettings = (): boolean => {
    // bot database, bot settings, bot permissions
    try {
      const values = form.getValues()
      builderSchema.shape.database.parse(values.database)
    } catch (e) {
      return false
    }
    return true
  }

  const validateFeatures = (): boolean => {
    // bot commands, bot listeners (in a list and via prompt if not in list) + bot plugins/features/behaviors
    try {
      const values = form.getValues()
      builderSchema.shape.preRenderedCommands.parse(values.preRenderedCommands)
      builderSchema.shape.preRenderedListeners.parse(
        values.preRenderedListeners,
      )
      builderSchema.shape.commandPrompts.parse(values.commandPrompts)
      builderSchema.shape.listenerPrompts.parse(values.listenerPrompts)
      builderSchema.shape.plugins.parse(values.plugins)
    } catch (e) {
      return false
    }
    return true
  }

  const validatePayment = (): boolean => {
    // payment
    return true
  }

  return (
    <Form
      form={form}
      onChange={() => {
        mutation.reset()
      }}
      onSubmit={async (values) => {
        await mutation.mutateAsync(values)
      }}
    >
      <Progress className="mb-3" value={Math.round((step / stepCount) * 100)} />
      <Carousel setApi={setApi} opts={{ watchDrag: false }}>
        <CarouselContent>
          <Step
            title="Give your bot some personality 🤖"
            next={api?.scrollNext}
            canNext={validateBaseSettings() || bypass}
            hidePreviousButton
          >
            <div className="max-2xl:space-y-4 2xl:grid grid-cols-3 gap-4">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot name</FormLabel>
                      <FormControl>
                        <Input placeholder="my-first-bot" {...field} />
                      </FormControl>
                      <FormDescription>
                        The name of the bot in the package.json
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot description</FormLabel>
                      <FormControl>
                        <Input placeholder="A cool bot" {...field} />
                      </FormControl>
                      <FormDescription>
                        The description of the bot in the package.json
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="prefix"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot prefix</FormLabel>
                      <FormControl>
                        <Input placeholder="!" {...field} />
                      </FormControl>
                      <FormDescription>
                        The default prefix the bot will respond to when you use
                        a textual command
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4 col-span-2">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>You Discord Application token</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="NTE1NDA3NjQwNzIyMTQ1Mjgx.GE92gF.NUZuEGqceSoH0Ml001cTvEnrkAqfpOydDvZm8A"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>The avatar of the bot</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Alert>
                  <RocketIcon className="h-4 w-4" />
                  <AlertTitle>You don't have a token?</AlertTitle>
                  <AlertDescription>
                    You can get a token by creating a Discord application on the{" "}
                    <Link
                      href="https://discord.com/developers/applications"
                      target="_blank"
                    >
                      Discord Developer Portal
                    </Link>
                    .<br /> You can find a guide on how to do this{" "}
                    <Link
                      href="https://discordjs.guide/preparations/setting-up-a-bot-application.html#creating-your-bot"
                      target="_blank"
                    >
                      here
                    </Link>
                    .
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </Step>
          <Step
            title={"Advanced settings 🛠️"}
            next={api?.scrollNext}
            previous={api?.scrollPrev}
            canNext={validateAdvancedSettings() || bypass}
            canPrevious
          >
            {/* todo: fill all fields with default values */}
          </Step>
          <Step
            title={"What can your bot do?"}
            next={api?.scrollNext}
            previous={api?.scrollPrev}
            canNext={validateFeatures() || bypass}
            canPrevious
          ></Step>
          <Step
            title="Payment 💲"
            buttonText={
              <>
                <span className="mr-2">Create</span>
                <RocketIcon size={16} />
              </>
            }
            next={api?.scrollNext}
            previous={api?.scrollPrev}
            canNext={validatePayment() || bypass}
            canPrevious
            submit
          ></Step>
          <Step
            title="Congratulations! 🎉"
            next={api?.scrollNext}
            canNext={botCreated || true}
            hidePreviousButton
          >
            {/* todo: Show a loader while the bot is creating, then show a download button. */}
            Your Discord bot has been successfully created!
            <br />
            You can now{" "}
            {/* todo: generate an invite link with the default bot permission parameters and the bot id */}
            <Link
              href="https://discordjs.guide/preparations/adding-your-bot-to-servers.html"
              target="_blank"
            >
              invite it to your server
            </Link>{" "}
            and start using it.
          </Step>
          <Step
            title="Give us your opinion!"
            previous={api?.scrollPrev}
            canPrevious
            hideNextButton
          >
            <ReviewForm
              user={props.user}
              currentValues={{
                rating: 5,
                userId: props.user.id,
              }}
            />
          </Step>
        </CarouselContent>
      </Carousel>
    </Form>
  )
}

const Step = (
  props: React.PropsWithChildren<{
    next?: () => void
    previous?: () => void
    canNext?: boolean
    canPrevious?: boolean
    title: string
    hidePreviousButton?: boolean
    hideNextButton?: boolean
    submit?: boolean
    buttonText?: React.ReactNode
  }>,
) => {
  return (
    <CarouselItem className="w-1">
      <Card>
        <CardHeader>
          <CardTitle>{props.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {props.children}
          <div className="flex items-center justify-end gap-4 mt-2">
            {!props.hidePreviousButton && (
              <Button
                type="button"
                onClick={() => props.canPrevious && props.previous?.()}
                disabled={!props.canPrevious}
                variant="ghost"
              >
                Cancel
              </Button>
            )}
            {!props.hideNextButton && (
              <Button
                type={props.submit ? "submit" : "button"}
                size={props.submit ? "lg" : "default"}
                onClick={() => props.canNext && props.next?.()}
                disabled={!props.canNext}
                className="w-52"
              >
                {props.buttonText ?? "Next"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </CarouselItem>
  )
}
