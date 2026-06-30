import { describe, it, expect } from 'vitest'
import {
  throwError,
  chunkArray,
  compareArrays,
  roundValue,
  parseNumber,
  parseCurrency,
  parsePercentage,
  parsePrice,
  priceToInteger,
  percentageToDecimal,
  validateBooleanString,
  isObject,
  isEmptyObject,
  getRandomArrayValue,
  parseError,
} from '../src/index.js'

describe('throwError', () => {
  it('throws with default status 400', () => {
    expect(() => throwError('something went wrong')).toThrow(
      JSON.stringify({ status: 400, message: 'something went wrong' }),
    )
  })

  it('throws with a custom status', () => {
    expect(() => throwError('not found', 404)).toThrow(
      JSON.stringify({ status: 404, message: 'not found' }),
    )
  })
})

describe('chunkArray', () => {
  it('returns the whole array as one chunk when length <= size', () => {
    expect(chunkArray([1, 2, 3], 5)).toEqual([[1, 2, 3]])
  })

  it('splits into chunks of the given size', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('handles an exact multiple', () => {
    expect(chunkArray([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]])
  })
})

describe('compareArrays', () => {
  it('returns elements in arr1 not in arr2', () => {
    expect(compareArrays([1, 2, 3], [2, 3])).toEqual([1])
  })

  it('returns empty array when arr1 is a subset of arr2', () => {
    expect(compareArrays([1, 2], [1, 2, 3])).toEqual([])
  })

  it('returns all of arr1 when arr2 is empty', () => {
    expect(compareArrays([1, 2], [])).toEqual([1, 2])
  })
})

describe('roundValue', () => {
  it('rounds to nearest hundredth by default', () => {
    expect(roundValue(1.236)).toBe(1.24)
    expect(roundValue(1.234)).toBe(1.23)
  })

  it('accepts a custom nearest multiplier', () => {
    expect(roundValue(1.005, 10)).toBe(1)
    expect(roundValue(1.15, 10)).toBe(1.2)
  })
})

describe('parseNumber', () => {
  it('converts string to number with no options', () => {
    expect(parseNumber('42')).toBe(42)
  })

  it('rounds to nearest with round option', () => {
    expect(parseNumber('1.234', { round: 100 })).toBe(1.23)
  })

  it('formats as currency string with type $', () => {
    expect(parseNumber('1234.5', { round: 100, zeros: 2, type: '$' })).toBe('$1234.50')
  })

  it('formats as percentage string with type %', () => {
    expect(parseNumber('12.5', { type: '%' })).toBe('12.5%')
  })
})

describe('parseCurrency', () => {
  it('formats as dollar string rounded to cents', () => {
    expect(parseCurrency(1234.5)).toBe('$1234.50')
  })
})

describe('parsePercentage', () => {
  it('formats as percentage string', () => {
    expect(parsePercentage(12.5)).toBe('12.5%')
  })
})

describe('parsePrice', () => {
  it('returns a number rounded to cents', () => {
    expect(parsePrice('1234.567')).toBe(1234.57)
  })
})

describe('priceToInteger', () => {
  it('strips dollar sign and comma', () => {
    expect(priceToInteger('$1,500')).toBe(1500)
  })

  it('handles plain number string', () => {
    expect(priceToInteger('2500')).toBe(2500)
  })
})

describe('percentageToDecimal', () => {
  it('converts percentage string to decimal', () => {
    expect(percentageToDecimal('50%')).toBe(0.5)
  })

  it('handles + prefix', () => {
    expect(percentageToDecimal('+25%')).toBe(0.25)
  })
})

describe('validateBooleanString', () => {
  it('returns true for "true"', () => {
    expect(validateBooleanString('true')).toBe(true)
  })

  it('returns true for "1"', () => {
    expect(validateBooleanString('1')).toBe(true)
  })

  it('returns false for other strings', () => {
    expect(validateBooleanString('false')).toBe(false)
    expect(validateBooleanString('yes')).toBe(false)
  })
})

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({ a: 1 })).toBe(true)
  })

  it('returns false for null', () => {
    expect(isObject(null as any)).toBe(false)
  })
})

describe('isEmptyObject', () => {
  it('returns true for an empty object', () => {
    expect(isEmptyObject({})).toBe(true)
  })

  it('returns false for a non-empty object', () => {
    expect(isEmptyObject({ a: 1 })).toBe(false)
  })
})

describe('getRandomArrayValue', () => {
  it('returns a value from the array', () => {
    const arr = [1, 2, 3]
    expect(arr).toContain(getRandomArrayValue(arr))
  })
})

describe('parseError', () => {
  it('parses an axios response error', () => {
    const error = { response: { status: 403, data: 'captcha' } }
    expect(parseError(error)).toEqual({ status: 403, message: 'captcha' })
  })

  it('parses a canceled axios error', () => {
    const error = { message: 'canceled' }
    const result = parseError(error)
    expect(result.status).toBe(400)
    expect(result.message).toMatch(/request timed out/)
  })

  it('parses a JSON-encoded message', () => {
    const error = { message: JSON.stringify({ status: 404, message: 'not found' }) }
    expect(parseError(error)).toEqual({ status: 404, message: 'not found' })
  })

  it('parses a plain status/message object', () => {
    const error = { status: 500, message: 'server error' }
    expect(parseError(error)).toEqual({ status: 500, message: 'server error' })
  })
})
