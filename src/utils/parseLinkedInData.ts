export interface ParsedLinkedInData {
  headline?: string;
  location?: string;
  follower_count?: number;
  connection_count?: number;
  profile_image_url?: string;
  current_employer?: string;
  current_position_title?: string;
  current_position_start_date?: string;
  years_in_current_role?: number;
  about?: string;
  skills?: string[];
  languages?: string[];
  total_years_experience?: number;
  industry_focus?: string;
  previous_employers?: string[];
  education_summary?: string;
  highest_degree?: string;
  profile_completeness_score?: number;
  last_activity_date?: string;
  work_history?: WorkExperience[];
}

export interface WorkExperience {
  company: string;
  title: string;
  start_date?: string;
  end_date?: string;
  duration?: string;
  description?: string;
  location?: string;
  is_current: boolean;
}

export function parseLinkedInProfile(rawData: any): ParsedLinkedInData {
  if (!rawData) return {};
  
  const text = typeof rawData === 'string' ? rawData : (rawData.text || JSON.stringify(rawData));
  
  return {
    headline: extractHeadline(text),
    location: extractLocation(text),
    follower_count: extractFollowerCount(text),
    connection_count: extractConnectionCount(text),
    profile_image_url: extractProfileImage(rawData),
    current_employer: extractCurrentEmployer(text),
    current_position_title: extractCurrentPosition(text),
    current_position_start_date: extractCurrentPositionStartDate(text),
    years_in_current_role: calculateYearsInCurrentRole(text),
    about: extractAbout(text),
    skills: extractSkills(text),
    languages: extractLanguages(text),
    total_years_experience: calculateTotalExperience(text),
    industry_focus: extractIndustry(text),
    previous_employers: extractPreviousEmployers(text),
    education_summary: extractEducationSummary(text),
    highest_degree: extractHighestDegree(text),
    profile_completeness_score: calculateProfileCompleteness(text),
    last_activity_date: null,
    work_history: extractWorkHistory(text),
  };
}

function extractHeadline(text: string): string | undefined {
  const headlineMatch = text.match(/###\s*([^\n]+?)\s*at\s+\[/);
  if (headlineMatch) return headlineMatch[1].trim();
  
  const altMatch = text.match(/\n\n([^\n]+?)\s*at\s+/m);
  return altMatch ? altMatch[1].trim() : undefined;
}

function extractLocation(text: string): string | undefined {
  const match = text.match(/###\s*([^,\[]+),\s*([^,\[]+)(?:,\s*([^\[]+))?\s*\[/);
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join(', ').trim();
  }
  return undefined;
}

function extractFollowerCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*followers?/i);
  return match ? parseInt(match[1]) : undefined;
}

function extractConnectionCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*connections?/i);
  return match ? parseInt(match[1]) : undefined;
}

function extractProfileImage(rawData: any): string | undefined {
  return rawData?.image || undefined;
}

function extractCurrentEmployer(text: string): string | undefined {
  const match = text.match(/###\s*[^\n]+?\s*at\s+\[([^\]]+)\]/);
  if (match) return match[1].trim();
  
  const workMatch = text.match(/##\s*Work Experience[^#]*###[^[]+at\s+\[([^\]]+)\]/);
  return workMatch ? workMatch[1].trim() : undefined;
}

function extractCurrentPosition(text: string): string | undefined {
  const match = text.match(/###\s*([^\n]+?)\s*at\s+\[/);
  return match ? match[1].trim() : undefined;
}

function extractCurrentPositionStartDate(text: string): string | undefined {
  const workSection = text.match(/##\s*Work Experience([\s\S]*?)(?=##|$)/);
  if (!workSection) return undefined;
  
  const dateMatch = workSection[1].match(/(\w+\s+\d{4})\s*-\s*Present/i);
  if (dateMatch) {
    const monthYear = dateMatch[1];
    return convertToISODate(monthYear);
  }
  return undefined;
}

function calculateYearsInCurrentRole(text: string): number | undefined {
  const workSection = text.match(/##\s*Work Experience([\s\S]*?)(?=##|$)/);
  if (!workSection) return undefined;
  
  const durationMatch = workSection[1].match(/•\s*(\d+)\s*years?\s*(\d+)?\s*months?/i);
  if (durationMatch) {
    const years = parseInt(durationMatch[1]);
    const months = durationMatch[2] ? parseInt(durationMatch[2]) : 0;
    return years + (months / 12);
  }
  return undefined;
}

function extractAbout(text: string): string | undefined {
  const match = text.match(/##\s*About me\s*\n\n([^\n#]+)/);
  return match ? match[1].trim() : undefined;
}

function extractSkills(text: string): string[] | undefined {
  // LinkedIn markdown doesn't typically include skills section in this format
  return undefined;
}

function extractLanguages(text: string): string[] | undefined {
  const langSection = text.match(/##\s*Languages([\s\S]*?)(?=##|$)/);
  if (!langSection) return undefined;
  
  const languages: string[] = [];
  const langMatches = langSection[1].matchAll(/###\s*([^\n]+)/g);
  for (const match of langMatches) {
    languages.push(match[1].trim());
  }
  return languages.length > 0 ? languages : undefined;
}

function calculateTotalExperience(text: string): number | undefined {
  const workSection = text.match(/##\s*Work Experience([\s\S]*?)(?=##|$)/);
  if (!workSection) return undefined;
  
  let totalYears = 0;
  const durationMatches = workSection[1].matchAll(/(\w+\s+\d{4})\s*-\s*(Present|\w+\s+\d{4})\s*•\s*(\d+)\s*years?(?:\s*(\d+)\s*months?)?/gi);
  
  for (const match of durationMatches) {
    const years = parseInt(match[3]);
    const months = match[4] ? parseInt(match[4]) : 0;
    totalYears += years + (months / 12);
  }
  
  return totalYears > 0 ? Math.round(totalYears * 10) / 10 : undefined;
}

function extractIndustry(text: string): string | undefined {
  const workSection = text.match(/##\s*Work Experience([\s\S]*?)(?=##|$)/);
  if (!workSection) return undefined;
  
  const industries = new Set<string>();
  const companyMatches = workSection[1].matchAll(/at\s+\[([^\]]+)\]/g);
  
  for (const match of companyMatches) {
    const company = match[1].toLowerCase();
    if (company.includes('bank') || company.includes('mortgage') || company.includes('financial')) {
      industries.add('Banking & Financial Services');
    } else if (company.includes('real estate')) {
      industries.add('Real Estate');
    }
  }
  
  return industries.size > 0 ? Array.from(industries).join(', ') : undefined;
}

function extractPreviousEmployers(text: string): string[] | undefined {
  const workSection = text.match(/##\s*Work Experience([\s\S]*?)(?=##|$)/);
  if (!workSection) return undefined;
  
  const employers: string[] = [];
  const companyMatches = workSection[1].matchAll(/at\s+\[([^\]]+)\]/g);
  
  let count = 0;
  for (const match of companyMatches) {
    if (count > 0 && count <= 4) { // Skip first (current), get next 4
      employers.push(match[1].trim());
    }
    count++;
    if (count > 5) break;
  }
  
  return employers.length > 0 ? employers : undefined;
}

function extractEducationSummary(text: string): string | undefined {
  const eduSection = text.match(/##\s*Education([\s\S]*?)(?=##|$)/);
  if (!eduSection) return undefined;
  
  const degrees: string[] = [];
  const degreeMatches = eduSection[1].matchAll(/###\s*([^\n]+?)\s*at\s+\[([^\]]+)\]/g);
  
  for (const match of degreeMatches) {
    const degree = match[1].trim();
    const school = match[2].trim();
    degrees.push(`${degree} from ${school}`);
  }
  
  return degrees.length > 0 ? degrees.join('; ') : undefined;
}

function extractHighestDegree(text: string): string | undefined {
  const eduSection = text.match(/##\s*Education([\s\S]*?)(?=##|$)/);
  if (!eduSection) return undefined;
  
  const degreeMatch = eduSection[1].match(/###\s*([^\n]+?)\s*at/);
  if (!degreeMatch) return undefined;
  
  const degree = degreeMatch[1].trim();
  if (degree.includes('Doctor') || degree.includes('PhD') || degree.includes('DME')) return 'Doctorate';
  if (degree.includes('Master')) return "Master's";
  if (degree.includes('Bachelor')) return "Bachelor's";
  if (degree.includes('Certificate')) return 'Certificate';
  
  return degree;
}

function calculateProfileCompleteness(text: string): number {
  let score = 0;
  
  if (text.includes('## About me')) score += 20;
  if (text.includes('## Work Experience')) score += 25;
  if (text.includes('## Education')) score += 20;
  if (text.match(/\d+\s*followers?/i)) score += 10;
  if (text.match(/\d+\s*connections?/i)) score += 10;
  if (text.includes('## Languages')) score += 5;
  if (text.includes('## Volunteering')) score += 5;
  if (text.match(/###.*at\s+\[/)) score += 5; // Has current position
  
  return Math.min(score, 100);
}

function extractWorkHistory(text: string): WorkExperience[] {
  const workSection = text.match(/##\s*Work Experience([\s\S]*?)(?=##|$)/);
  if (!workSection) return [];
  
  const history: WorkExperience[] = [];
  const experienceBlocks = workSection[1].split(/(?=###\s*[^#])/);
  
  for (const block of experienceBlocks) {
    if (!block.trim()) continue;
    
    const titleMatch = block.match(/###\s*([^\n]+?)\s*at\s+\[([^\]]+)\]/);
    if (!titleMatch) continue;
    
    const title = titleMatch[1].trim();
    const company = titleMatch[2].trim();
    
    const dateMatch = block.match(/(\w+\s+\d{4})\s*-\s*(Present|\w+\s+\d{4})\s*•\s*(\d+)\s*years?(?:\s*(\d+)\s*months?)?/i);
    const descMatch = block.match(/\n([^\n]+(?:\n(?!###)[^\n]+)*)/);
    const locationMatch = block.match(/\n([^,\n]+,\s*[^,\n]+(?:,\s*[^\n]+)?)\n/);
    
    history.push({
      company,
      title,
      start_date: dateMatch ? dateMatch[1] : undefined,
      end_date: dateMatch ? (dateMatch[2] === 'Present' ? 'Present' : dateMatch[2]) : undefined,
      duration: dateMatch ? `${dateMatch[3]} years${dateMatch[4] ? ` ${dateMatch[4]} months` : ''}` : undefined,
      description: descMatch ? descMatch[1].trim() : undefined,
      location: locationMatch ? locationMatch[1].trim() : undefined,
      is_current: dateMatch ? dateMatch[2].toLowerCase() === 'present' : false,
    });
  }
  
  return history;
}

function convertToISODate(monthYear: string): string {
  const months: Record<string, string> = {
    'jan': '01', 'january': '01',
    'feb': '02', 'february': '02',
    'mar': '03', 'march': '03',
    'apr': '04', 'april': '04',
    'may': '05',
    'jun': '06', 'june': '06',
    'jul': '07', 'july': '07',
    'aug': '08', 'august': '08',
    'sep': '09', 'september': '09',
    'oct': '10', 'october': '10',
    'nov': '11', 'november': '11',
    'dec': '12', 'december': '12',
  };
  
  const parts = monthYear.split(/\s+/);
  if (parts.length !== 2) return monthYear;
  
  const month = months[parts[0].toLowerCase()];
  const year = parts[1];
  
  return month ? `${year}-${month}-01` : monthYear;
}
