import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/callout'
import { Field, Input } from '@/components/ui/field'
import { TOKEN_KEY, useSession } from '@/auth/session'
import { config } from '@/config'
import { apiLogin, apiMe, createHttpClient } from '@/data/http/httpRepository'

const schema = z.object({
  companySlug: z.string().trim().min(1, 'Informe o código da empresa.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe a senha.'),
})

/** Entrada real (VITE_DATA_SOURCE=api): POST /auth/login + GET /auth/me. */
export function ApiLoginForm() {
  const { signInWith } = useSession()
  const navigate = useNavigate()
  const [error, setError] = useState<string>()
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { companySlug: '', email: '', password: '' } })
  const e = form.formState.errors

  const onSubmit = form.handleSubmit(async (v) => {
    setError(undefined)
    const client = createHttpClient(config.apiBaseUrl, () => sessionStorage.getItem(TOKEN_KEY))
    try {
      const token = await apiLogin(client, v)
      sessionStorage.setItem(TOKEN_KEY, token.access_token)
      const { profile, driver } = await apiMe(client)
      if (profile.role === 'driver' && !driver) {
        sessionStorage.removeItem(TOKEN_KEY)
        setError('Seu usuário ainda não está vinculado a um motorista. Peça ao gestor para fazer o vínculo.')
        return
      }
      const role = profile.role === 'manager' ? 'gestor' : 'motorista'
      signInWith({
        role,
        // Lançamentos são filtrados por motorista: o id usado é o do cadastro de motorista.
        userId: driver?.id ?? profile.id,
        name: profile.name,
        vehicleId: driver?.vehicle_id ?? undefined,
      })
      navigate(role === 'gestor' ? '/gestor' : '/motorista')
    } catch (err) {
      sessionStorage.removeItem(TOKEN_KEY)
      setError((err as Error).message)
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
      {error && (
        <Callout tone="bad" role="alert">
          {error}
        </Callout>
      )}
      <Field label="Código da empresa" error={e.companySlug?.message}>
        {(p) => <Input {...p} {...form.register('companySlug')} autoComplete="organization" />}
      </Field>
      <Field label="E-mail" error={e.email?.message}>
        {(p) => <Input {...p} {...form.register('email')} type="email" autoComplete="username" />}
      </Field>
      <Field label="Senha" error={e.password?.message}>
        {(p) => <Input {...p} {...form.register('password')} type="password" autoComplete="current-password" />}
      </Field>
      <Button type="submit" variant="primary" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Entrar
      </Button>
    </form>
  )
}
