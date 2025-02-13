import { CommitInfo } from '../types';
import { TimePreferences } from '../types/preferences';

export interface CommitWeight {
  hash: string;
  repoPath: string;
  weight: number;
}

export class DistributionService {
  private static calculateCommitWeight(commit: CommitInfo, strategy: TimePreferences['distributionStrategy'] = 'commit-size'): number {
    console.log("strategy",strategy);
    switch (strategy) {
      case 'equal':
        return 1;
      case 'time-based':
        return this.calculateTimeBasedWeight(commit);
      case 'impact-analysis':
        return this.calculateImpactWeight(commit);
      case 'commit-size':
      default:
        return this.calculateSizeBasedWeight(commit);
    }
  }

  private static calculateSizeBasedWeight(commit: CommitInfo): number {
    // If no diff stats available, return 1 for equal distribution
    if (!commit.diffStats) {
      return 1;
    }

    let weight = 0;

    // Weight for number of files changed
    weight += commit.diffStats.filesChanged * 0.5;

    // Weight for lines changed (both insertions and deletions)
    const totalLines = commit.diffStats.insertions + commit.diffStats.deletions;
    weight += Math.min(totalLines / 50, 2) * 0.3; // Cap at 2 points for lines changed

    // Weight based on file types
    commit.diffStats.files.forEach(file => {
      switch (file.type) {
        case 'source':
          weight += 1.0; // Source code changes are most significant
          break;
        case 'test':
          weight += 0.5; // Test changes are moderately significant
          break;
        case 'config':
          weight += 0.3; // Config changes are less significant
          break;
        case 'other':
          weight += 0.6; // Other file types have minimal impact
          break;
      }

      // Additional weight for large file changes
      weight += Math.min(file.changes / 100, 1) * 0.5;
    });

    return Math.max(0.1, weight); // Ensure minimum weight of 0.1
  }

  private static calculateTimeBasedWeight(commit: CommitInfo): number {
    const commitDate = new Date(commit.date);
    const hour = commitDate.getHours();
    
    // Base weight starts at 1
    let weight = 1;

    // Core working hours (9 AM to 5 PM) get higher weight
    if (hour >= 9 && hour < 17) {
      weight *= 1.5;
    }
    // Early morning (6 AM to 9 AM) and early evening (5 PM to 8 PM) get medium weight
    else if ((hour >= 6 && hour < 9) || (hour >= 17 && hour < 20)) {
      weight *= 1.2;
    }
    // Late night commits get lower weight
    else if (hour >= 20 || hour < 6) {
      weight *= 0.8;
    }

    // If we have diff stats, factor in the size as well
    if (commit.diffStats) {
      // Add small weight for number of files (0.1 per file)
      weight += commit.diffStats.filesChanged * 0.1;
      
      // Add small weight for lines changed (0.1 per 50 lines, max 1.0)
      const totalLines = commit.diffStats.insertions + commit.diffStats.deletions;
      weight += Math.min(totalLines / 50, 1) * 0.1;
    }

    return Math.max(0.1, weight); // Ensure minimum weight of 0.1
  }

  private static calculateImpactWeight(commit: CommitInfo): number {
    if (!commit.diffStats) {
      console.log('No diff stats available for impact analysis');
      return 1;
    }

    console.log('Calculating impact weight for commit:', {
      hash: commit.hash,
      message: commit.message,
      filesChanged: commit.diffStats.filesChanged
    });

    let weight = 0;
    const fileWeights: { filename: string; weight: number; reason: string }[] = [];

    // Define constants for file weights and reasons
    const FILE_TYPE_WEIGHTS: { [key: string]: { weight: number; reason: string } } = {
      core: { weight: 2.0, reason: 'Core business logic' },
      ui: { weight: 1.5, reason: 'UI Component' },
      api: { weight: 1.8, reason: 'API/Data Access' },
      utils: { weight: 1.0, reason: 'Utils/Helpers' },
      test: { weight: 0.8, reason: 'Test file' },
      config: { weight: 0.5, reason: 'Configuration' },
      other: { weight: 0.3, reason: 'Other' },
    };

    // Define arrays for file type categories
    const CORE_FILE_PATHS = ['/services/', '/models/', '/core/', '/business/', '/domain/', '/controllers/', '/routes/',];
    const UI_FILE_PATHS = ['/components/', '/views/', '/pages/', '/ui/', '/styles/', '/themes/', '/layout/', '/navigation/', '/forms/'];
    const API_FILE_PATHS = ['/api/', '/data/', '/repositories/'];
    const UTILS_FILE_PATHS = ['/utils/', '/helpers/', '/common/'];
    const TEST_FILE_PATHS = ['.test.', '.spec.', '/__tests__/'];
    const CONFIG_FILE_EXTENSIONS = ['json', 'yml', 'yaml', 'config', 'env'];

    // Analyze each file's impact
    commit.diffStats.files.forEach(file => {
      const fileName = file.filename.toLowerCase();
      const extension = fileName.split('.').pop() || '';
      let fileWeight = 0;
      let reason = '';

      // Determine file type and assign weight and reason using arrays
      if (CORE_FILE_PATHS.some(path => fileName.includes(path))) {
        fileWeight += FILE_TYPE_WEIGHTS.core.weight;
        reason = FILE_TYPE_WEIGHTS.core.reason;
      } else if (UI_FILE_PATHS.some(path => fileName.includes(path))) {
        fileWeight += FILE_TYPE_WEIGHTS.ui.weight;
        reason = FILE_TYPE_WEIGHTS.ui.reason;
      } else if (API_FILE_PATHS.some(path => fileName.includes(path))) {
        fileWeight += FILE_TYPE_WEIGHTS.api.weight;
        reason = FILE_TYPE_WEIGHTS.api.reason;
      } else if (UTILS_FILE_PATHS.some(path => fileName.includes(path))) {
        fileWeight += FILE_TYPE_WEIGHTS.utils.weight;
        reason = FILE_TYPE_WEIGHTS.utils.reason;
      } else if (TEST_FILE_PATHS.some(path => fileName.includes(path))) {
        fileWeight += FILE_TYPE_WEIGHTS.test.weight;
        reason = FILE_TYPE_WEIGHTS.test.reason;
      } else if (CONFIG_FILE_EXTENSIONS.includes(extension) || fileName.includes('.env')) {
        fileWeight += FILE_TYPE_WEIGHTS.config.weight;
        reason = FILE_TYPE_WEIGHTS.config.reason;
      } else {
        fileWeight += FILE_TYPE_WEIGHTS.other.weight;
        reason = FILE_TYPE_WEIGHTS.other.reason;
      }

      // Factor in the size of changes
      const changeImpact = Math.min(file.changes / 50, 2);
      fileWeight += changeImpact * 0.5;

      weight += fileWeight;
      fileWeights.push({
        filename: fileName,
        weight: fileWeight,
        reason: `${reason} (base) + ${changeImpact * 0.5} (size impact)`
      });
    });

    // Consider the number of files as a multiplier for broad impact
    const fileCountMultiplier = Math.min(commit.diffStats.filesChanged / 5, 1.5);
    const finalMultiplier = 1 + (fileCountMultiplier - 1) * 0.5;
    
    weight *= finalMultiplier;

    console.log('Impact weight calculation:', {
      fileWeights,
      fileCountMultiplier,
      finalMultiplier,
      finalWeight: Math.max(0.1, weight)
    });

    return Math.max(0.1, weight);
  }

  private static smartRound(
    numbers: number[],
    totalTarget: number,
    precision: number
  ): number[] {
    // Input validation
    console.log('Smart Round Input:', { numbers, totalTarget, precision });
    
    if (numbers.some(n => isNaN(n))) {
      console.warn('Invalid input numbers:', numbers);
      // Fall back to equal distribution
      return numbers.map(() => Number((totalTarget / numbers.length).toFixed(precision)));
    }

    // Ensure precision is between 0 and 4
    precision = Math.max(0, Math.min(4, precision));
    const factor = Math.pow(10, precision);

    // Initial rounding
    let rounded = numbers.map(n => Math.round(n * factor) / factor);
    console.log('After initial rounding:', rounded);

    // Calculate the current sum and the difference from target
    let currentSum = rounded.reduce((a, b) => a + b, 0);
    let difference = totalTarget - currentSum;
    console.log('Current sum and difference:', { currentSum, difference });

    // If the difference is negligible, return the rounded numbers
    if (Math.abs(difference) < 0.00001) {
      return rounded;
    }

    // Find candidates for adjustment
    const adjustmentStep = 1 / factor;
    const numAdjustments = Math.round(Math.abs(difference) * factor);
    
    if (difference > 0) {
      // Need to increase some numbers
      const candidates = rounded.map((n, i) => ({ index: i, value: n }))
        .sort((a, b) => a.value - b.value);

      for (let i = 0; i < numAdjustments && i < candidates.length; i++) {
        rounded[candidates[i].index] += adjustmentStep;
      }
    } else {
      // Need to decrease some numbers
      const candidates = rounded.map((n, i) => ({ index: i, value: n }))
        .sort((a, b) => b.value - a.value);

      for (let i = 0; i < numAdjustments && i < candidates.length; i++) {
        rounded[candidates[i].index] = Math.max(0, rounded[candidates[i].index] - adjustmentStep);
      }
    }

    // Final validation
    const finalSum = rounded.reduce((a, b) => a + b, 0);
    console.log('Final sum:', finalSum);
    
    if (Math.abs(finalSum - totalTarget) > 0.01) {
      console.warn('Failed to achieve target sum, falling back to proportional distribution');
      return numbers.map(() => Number((totalTarget / numbers.length).toFixed(precision)));
    }

    return rounded;
  }

  private static normalizeHours(
    hours: number[],
    minHours: number,
    maxHours: number,
    totalTarget: number
  ): number[] {
    console.log('Normalize Hours Input:', { hours, minHours, maxHours, totalTarget });

    // Handle invalid input
    if (hours.some(h => isNaN(h))) {
      console.warn('Invalid hours detected in normalization:', hours);
      return hours.map(() => totalTarget / hours.length);
    }

    let normalized = [...hours];
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      let excess = 0;

      // Adjust values outside bounds
      normalized = normalized.map(h => {
        if (isNaN(h) || h < minHours) {
          excess += minHours - (isNaN(h) ? 0 : h);
          return minHours;
        }
        if (h > maxHours) {
          excess += h - maxHours;
          return maxHours;
        }
        return h;
      });

      if (Math.abs(excess) < 0.0001) break;

      // Redistribute excess proportionally
      const adjustableIndices = normalized.map((h, i) => i)
        .filter(i => normalized[i] > minHours && normalized[i] < maxHours);

      if (adjustableIndices.length === 0) break;

      const adjustmentPerIndex = excess / adjustableIndices.length;
      adjustableIndices.forEach(i => {
        normalized[i] = Math.max(minHours, Math.min(maxHours, normalized[i] - adjustmentPerIndex));
      });

      iterations++;
    }

    // Ensure the sum matches the target
    const currentSum = normalized.reduce((sum, h) => sum + h, 0);
    if (Math.abs(currentSum - totalTarget) > 0.0001) {
      const factor = totalTarget / currentSum;
      normalized = normalized.map(h => Number((h * factor).toFixed(4))); // Use 4 decimal places for intermediate calculations
    }

    console.log('Normalize Hours Output:', normalized);

    // Final validation
    const finalSum = normalized.reduce((a, b) => a + b, 0);
    if (Math.abs(finalSum - totalTarget) > 0.01) {
      console.warn('Normalization failed to achieve target sum:', {
        finalSum,
        targetSum: totalTarget,
        difference: finalSum - totalTarget
      });
      // Fall back to proportional distribution within bounds
      return hours.map(() => Number((totalTarget / hours.length).toFixed(4)));
    }

    return normalized;
  }

  static distributeHours(
    commits: CommitInfo[],
    totalHours: number,
    preferences: TimePreferences
  ): Map<string, number> {
    console.log('Distribution Strategy:', preferences.distributionStrategy);
    const distribution = new Map<string, number>();
    
    if (commits.length === 0) return distribution;

    // Ensure we have valid numbers
    if (isNaN(totalHours) || totalHours <= 0) {
      console.warn('Invalid total hours provided:', totalHours);
      return distribution;
    }

    // Validate preferences
    if (!preferences.roundingPrecision || isNaN(preferences.roundingPrecision)) {
      console.warn('Invalid rounding precision, defaulting to 2');
      preferences.roundingPrecision = 2;
    }
    if (!preferences.minimumCommitHours || isNaN(preferences.minimumCommitHours)) {
      console.warn('Invalid minimum hours, defaulting to 0.25');
      preferences.minimumCommitHours = 0.25;
    }
    if (!preferences.maximumCommitHours || isNaN(preferences.maximumCommitHours)) {
      console.warn('Invalid maximum hours, defaulting to 4');
      preferences.maximumCommitHours = 4;
    }

    let weights: number[];
    console.log('Calculating weights with strategy:', preferences.distributionStrategy);
    
    // Remove the switch and directly use calculateCommitWeight with strategy
    weights = commits.map(commit => {
      const weight = this.calculateCommitWeight(commit, preferences.distributionStrategy);
      console.log(`Weight for commit ${commit.hash}:`, weight);
      return weight;
    });

    // Ensure no NaN or zero weights
    weights = weights.map(w => isNaN(w) || w <= 0 ? 1 : w);
    console.log('Initial weights:', weights);

    // Calculate total weight
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    console.log('Total weight:', totalWeight);
    
    // If total weight is 0 or NaN, fall back to equal distribution
    if (totalWeight <= 0 || isNaN(totalWeight)) {
      console.warn('Invalid total weight, falling back to equal distribution');
      const equalHours = Number((totalHours / commits.length).toFixed(preferences.roundingPrecision));
      commits.forEach(commit => distribution.set(commit.hash, equalHours));
      return distribution;
    }

    // Calculate initial distribution
    let hours = weights.map(w => Number((w / totalWeight * totalHours).toFixed(4)));
    console.log('Initial hours distribution:', hours);

    // Normalize hours within bounds
    hours = this.normalizeHours(
      hours,
      preferences.minimumCommitHours,
      preferences.maximumCommitHours,
      totalHours
    );
    console.log('Normalized hours:', hours);

    // Smart round to ensure exact total
    hours = this.smartRound(hours, totalHours, preferences.roundingPrecision);
    console.log('Final rounded hours:', hours);

    // Create the final distribution map
    commits.forEach((commit, index) => {
      const distributedHours = hours[index];
      // Final safety check to ensure no NaN values
      distribution.set(
        commit.hash, 
        isNaN(distributedHours) ? 
          Number((totalHours / commits.length).toFixed(preferences.roundingPrecision)) : 
          distributedHours
      );
    });
    console.log('Final distribution:', Object.fromEntries(distribution));

    return distribution;
  }

  // Example demonstrating how the distribution works
  static getDistributionExample(): { commits: CommitInfo[]; distribution: Map<string, number>; explanation: string[] } {
    // Example commits with different types of changes
    const commits: CommitInfo[] = [
      {
        hash: '1',
        message: 'Small config change',
        date: new Date().toISOString(),
        branch: 'main',
        formattedMessage: 'Small config change',
        diffStats: {
          filesChanged: 1,
          insertions: 5,
          deletions: 2,
          files: [
            {
              filename: 'config.json',
              changes: 7,
              insertions: 5,
              deletions: 2,
              type: 'config'
            }
          ]
        }
      },
      {
        hash: '2',
        message: 'Major feature implementation',
        date: new Date().toISOString(),
        branch: 'main',
        formattedMessage: 'Major feature implementation',
        diffStats: {
          filesChanged: 3,
          insertions: 150,
          deletions: 50,
          files: [
            {
              filename: 'src/feature.ts',
              changes: 120,
              insertions: 100,
              deletions: 20,
              type: 'source'
            },
            {
              filename: 'src/feature.test.ts',
              changes: 60,
              insertions: 40,
              deletions: 20,
              type: 'test'
            },
            {
              filename: 'README.md',
              changes: 20,
              insertions: 10,
              deletions: 10,
              type: 'other'
            }
          ]
        }
      },
      {
        hash: '3',
        message: 'Update tests',
        date: new Date().toISOString(),
        branch: 'main',
        formattedMessage: 'Update tests',
        diffStats: {
          filesChanged: 2,
          insertions: 30,
          deletions: 10,
          files: [
            {
              filename: 'src/feature.test.ts',
              changes: 35,
              insertions: 25,
              deletions: 10,
              type: 'test'
            },
            {
              filename: 'test/helpers.ts',
              changes: 5,
              insertions: 5,
              deletions: 0,
              type: 'test'
            }
          ]
        }
      }
    ];

    // Calculate weights and explain the calculation
    const explanation: string[] = [];
    const weights = commits.map(commit => {
      const weight = this.calculateCommitWeight(commit);
      
      // Explain weight calculation for each commit
      const details: string[] = [];
      
      details.push(`Files changed (${commit.diffStats!.filesChanged} × 0.5): ${commit.diffStats!.filesChanged * 0.5}`);
      
      const totalLines = commit.diffStats!.insertions + commit.diffStats!.deletions;
      const linesWeight = Math.min(totalLines / 50, 2) * 0.3;
      details.push(`Lines changed (${totalLines} lines ÷ 50 × 0.3, max 2): ${linesWeight.toFixed(2)}`);
      
      commit.diffStats!.files.forEach(file => {
        let fileTypeWeight = 0;
        switch (file.type) {
          case 'source': fileTypeWeight = 1.0; break;
          case 'test': fileTypeWeight = 0.5; break;
          case 'config': fileTypeWeight = 0.3; break;
          case 'other': fileTypeWeight = 0.2; break;
        }
        const fileChangeWeight = Math.min(file.changes / 100, 1) * 0.5;
        details.push(`${file.filename} (${file.type}): type weight ${fileTypeWeight}, size weight ${fileChangeWeight.toFixed(2)}`);
      });
      
      explanation.push(`Commit ${commit.hash} - ${commit.message}:\n  ${details.join('\n  ')}\n  Total weight: ${weight.toFixed(2)}`);
      return weight;
    });

    // Example preferences
    const preferences: TimePreferences = {
      enforce8Hours: true,
      autoRedistributeHours: true,
      distributeAcrossRepositories: false,
      distributionStrategy: 'commit-size',
      minimumCommitHours: 0.25,
      maximumCommitHours: 4,
      roundingPrecision: 2
    };

    // Distribute 8 hours
    const distribution = this.distributeHours(commits, 8, preferences);

    // Add final distribution to explanation
    explanation.push('\nFinal Hour Distribution:');
    distribution.forEach((hours, hash) => {
      const commit = commits.find(c => c.hash === hash);
      explanation.push(`${commit?.message}: ${hours.toFixed(2)} hours`);
    });

    return { commits, distribution, explanation };
  }
} 