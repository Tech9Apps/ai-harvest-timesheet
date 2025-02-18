/**
 * Utility functions for handling time conversions
 */

/**
 * Converts hours and minutes to decimal hours
 * @param hours Whole hours
 * @param minutes Minutes (0-59)
 * @returns Decimal hours (e.g., 3 hours 30 minutes = 3.5 hours)
 */
export function hoursAndMinutesToDecimal(hours: number, minutes: number): number {
    return Number((hours + minutes / 60).toFixed(4));
}

/**
 * Converts decimal hours to hours and minutes
 * @param decimalHours Decimal hours (e.g., 3.5 = 3 hours 30 minutes)
 * @returns Object containing hours and minutes
 */
export function decimalToHoursAndMinutes(decimalHours: number): { hours: number; minutes: number } {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return { hours, minutes };
}

/**
 * Formats decimal hours as a human-readable string
 * @param decimalHours Decimal hours (e.g., 3.5)
 * @returns Formatted string (e.g., "3h 30m")
 */
export function formatHours(decimalHours: number): string {
    const { hours, minutes } = decimalToHoursAndMinutes(decimalHours);
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
}

/**
 * Parses a time string into decimal hours
 * @param timeStr Time string in format "Xh Ym" (e.g., "3h 30m")
 * @returns Decimal hours
 */
export function parseTimeToDecimal(timeStr: string): number {
    // Try to parse "Xh Ym" format
    const match = timeStr.toLowerCase().match(/^(\d+)h(?:\s*(\d+)m)?$/);
    if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        
        if (minutes >= 60) {
            throw new Error('Minutes must be less than 60');
        }
        
        return hoursAndMinutesToDecimal(hours, minutes);
    }

    throw new Error('Please use the format "Xh Ym" (e.g., "3h 30m" or "3h")');
} 