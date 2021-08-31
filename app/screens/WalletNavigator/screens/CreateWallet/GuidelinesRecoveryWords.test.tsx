import { render } from '@testing-library/react-native'
import * as React from 'react'
import { GuidelinesRecoveryWords } from './GuidelinesRecoveryWords'

jest.mock('../../../../contexts/ThemeProvider')
describe('recovery words guidelines', () => {
  it('should match snapshot', () => {
    const rendered = render(<GuidelinesRecoveryWords />)
    expect(rendered.toJSON()).toMatchSnapshot()
  })
})
