import {
  outro,
  confirm,
  isCancel,
  cancel,
} from '@clack/prompts'
import { setTimeout as sleep } from 'node:timers/promises'

export async function runConfirmBrowserLaunch() {
  const shouldContinue = await confirm({
    message: 'We need to launch your browser to continue',
    active: 'OK',
    inactive: 'Cancel',
  })

  if (isCancel(shouldContinue) || !shouldContinue) {
    cancel('Create config canceled. Please try again.')
    return process.exit(1)
  }

  await sleep(1000)

  outro('Browser Launching...')

  await sleep(1000)
}
