"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { saveReturnAddress } from "@/app/actions/settings"
import type { UserSettings } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

export function ReturnAddressForm({ settings }: { settings: UserSettings }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [name, setName] = useState(settings.return_name)
  const [line1, setLine1] = useState(settings.return_line1)
  const [line2, setLine2] = useState(settings.return_line2)
  const [city, setCity] = useState(settings.return_city)
  const [stateReg, setStateReg] = useState(settings.return_state)
  const [postal, setPostal] = useState(settings.return_postal_code)
  const [country, setCountry] = useState(settings.return_country)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await saveReturnAddress({
          return_name: name,
          return_line1: line1,
          return_line2: line2,
          return_city: city,
          return_state: stateReg,
          return_postal_code: postal,
          return_country: country,
        })
        toast.success("Return address saved")
        router.refresh()
      } catch {
        toast.error("Something went wrong. Please try again.")
      }
    })
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="r-name">Name</FieldLabel>
            <Input
              id="r-name"
              autoComplete="name"
              placeholder="Connor Filley"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="r-line1">Street address</FieldLabel>
            <Input
              id="r-line1"
              autoComplete="address-line1"
              placeholder="123 Maple Street"
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="r-line2">
              Apt, suite, etc.{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="r-line2"
              autoComplete="address-line2"
              placeholder="Apt 4B"
              value={line2}
              onChange={(e) => setLine2(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="r-city">City</FieldLabel>
              <Input
                id="r-city"
                autoComplete="address-level2"
                placeholder="Austin"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="r-state">State / Region</FieldLabel>
              <Input
                id="r-state"
                autoComplete="address-level1"
                placeholder="TX"
                value={stateReg}
                onChange={(e) => setStateReg(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="r-postal">ZIP / Postal</FieldLabel>
              <Input
                id="r-postal"
                autoComplete="postal-code"
                placeholder="78701"
                value={postal}
                onChange={(e) => setPostal(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="r-country">
                Country{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </FieldLabel>
              <Input
                id="r-country"
                autoComplete="country-name"
                placeholder="USA"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </Field>
          </div>
        </FieldGroup>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Save return address
          </Button>
        </div>
      </form>
    </Card>
  )
}
