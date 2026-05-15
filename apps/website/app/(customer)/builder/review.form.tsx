"use client"

import type { User } from "@prisma/client"
import { useMutation } from "@tanstack/react-query"
import { RocketIcon } from "lucide-react"
import React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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
import { UserAvatar } from "@/components/ui/user-avatar"
import { submitReview } from "./review.action"
import { type ReviewValues, reviewSchema } from "./review.schema"
import { ReviewStars } from "./review.stars"

type ReviewFormProps = {
  user: User
  currentValues?: ReviewValues
}

export const ReviewForm = (props: ReviewFormProps) => {
  const form = useZodForm({
    schema: reviewSchema,
    defaultValues: props.currentValues,
  })

  const mutation = useMutation({
    mutationFn: async (values: ReviewValues) => {
      const { data, serverError } = await submitReview(values)

      if (serverError || !data) {
        toast.error("An error occurred while submitting the review.")
        return
      }

      toast.success("Thank you for your feedback! 🎉")
    },
  })

  const validateForm = (): boolean => {
    try {
      reviewSchema.parse(form.getValues())
    } catch (e: any) {
      return false
    }
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
      className="space-y-6 flex flex-col items-center"
    >
      <UserAvatar user={props.user} className="size-16" />
      <FormField
        control={form.control}
        name="rating"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <div className="text-center w-full">
                {props.user.name ?? "User"}'s Rating
              </div>
            </FormLabel>
            <FormControl>
              <ReviewStars
                value={field.value}
                onChange={field.onChange.bind(field)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="text"
        render={({ field }) => (
          <FormItem>
            {/*<FormLabel>*/}
            {/*  <div className="text-center w-full">Review</div>*/}
            {/*</FormLabel>*/}
            <FormControl>
              <Input placeholder="Noice!" {...field} />
            </FormControl>
            <FormDescription className="text-center w-full">
              A short review about the service
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <input type="hidden" name="userId" value={props.user.id} />
      <Button type="submit" size="lg" disabled={!validateForm()}>
        <span className="mr-2">Submit the review!</span>{" "}
        <RocketIcon size={16} />
      </Button>
    </Form>
  )
}
