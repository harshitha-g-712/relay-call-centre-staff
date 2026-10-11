import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'
afterEach(cleanup)

describe('call queue', () => {
  it('changes customer context when a queue item is selected', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Marcus Johnson/ }))
    expect(screen.getByRole('heading', { name: 'Marcus Johnson' })).toBeTruthy()
  })

  it('filters queue calls by search text', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Search calls' }))
    fireEvent.change(screen.getByPlaceholderText('Search names, topics, or IDs'), { target: { value: 'Sofia' } })
    expect(screen.getByRole('button', { name: /Sofia Ramirez/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Marcus Johnson/ })).toBeNull()
  })

  it('saves an agent note', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Add an agent note'), { target: { value: 'Follow up tomorrow.' } })
    fireEvent.click(screen.getByLabelText('Save note'))
    expect(screen.getByText('Follow up tomorrow.')).toBeTruthy()
  })
})



describe('call lifecycle safeguards', () => {
  it('blocks queue selection while a call is active', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start a call' }))
    expect(screen.getByRole('button', { name: /Marcus Johnson/ })).toHaveProperty('disabled', true)
    expect(screen.getByText(/Call in progress/)).toBeTruthy()
  })

  it('requires a disposition before completing ACW', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start a call' }))
    fireEvent.click(screen.getByRole('button', { name: 'End call' }))
    expect(screen.getByRole('dialog', { name: /Wrap up Olivia Chen’s call/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Complete Wrap-up' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText(/Disposition/), { target: { value: 'Resolved' } })
    expect(screen.getByRole('button', { name: 'Complete Wrap-up' })).toHaveProperty('disabled', false)
    fireEvent.click(screen.getByRole('button', { name: 'Complete Wrap-up' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('resets hold and mute when ending a call', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Start a call' }))
    fireEvent.click(screen.getByRole('button', { name: /Hold/ }))
    fireEvent.click(screen.getByRole('button', { name: /Mute/ }))
    fireEvent.click(screen.getByRole('button', { name: 'End call' }))
    expect(screen.queryByRole('button', { name: /Resume/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Unmute/ })).toBeNull()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
