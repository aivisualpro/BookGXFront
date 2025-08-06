export interface User {
  Name: string;
  Role: string;
  Password: string;
  Cards?: string; // Comma-separated list of cards user can access
}

export async function fetchUsersData(): Promise<User[]> {
  try {
    const response = await fetch('https://docs.google.com/spreadsheets/d/1bJ6vpncb86X_em7JWt22Ydt7I3RhJrOQ5gC4qTgwQ4A/export?format=csv');
    
    if (!response.ok) {
      throw new Error('Failed to fetch users data');
    }
    
    const csvText = await response.text();
    console.log('Raw CSV data:', csvText.substring(0, 500) + '...');
    
    const lines = csvText.split('\n');
    console.log('CSV lines count:', lines.length);
    
    // Skip the header row and parse the data
    const users: User[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Improved CSV parsing to handle quotes and spaces
        const columns = parseCSVLine(line);
        console.log(`Line ${i}:`, columns);
        
        if (columns.length >= 3) {
          const user = {
            Name: columns[0]?.trim() || '',
            Role: columns[1]?.trim() || '',
            Password: columns[2]?.trim() || '',
            Cards: cleanCardString(columns[3]?.trim() || getDefaultCardsForRole(columns[1]?.trim() || ''))
          };
          
          // Special debugging for newrec user
          if (user.Name.toLowerCase().includes('newrec')) {
            console.log('🔍 FOUND NEWREC USER:', user);
            console.log('🔍 Cards string:', user.Cards);
            console.log('🔍 Cards parsed:', user.Cards.split(',').map(card => card.trim()));
          }
          
          console.log('Parsed user:', user);
          users.push(user);
        }
      }
    }
    
    console.log('Final users array:', users);
    return users;
  } catch (error) {
    console.error('Error fetching users data:', error);
    // Return mock data as fallback with card permissions
    return [
      { Name: 'adeel', Role: 'Admin', Password: '123', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Abdul Hadi', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Yasser', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'دينا', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'بشري', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'anaml.rawda@gmail.com', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: '.jeddah Team', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'نظيرة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'منسقة1', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'منسقة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'مها', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'منسة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Alhnoaf', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Rana', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Francela', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'VANIA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Luana', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Israa', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Angham', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Jessica', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Thatiane', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'PAULA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'SARA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'GABRIELA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'GLEICE', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'VIVIANA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'ESRAA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'RAFAELA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'SOLANA', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'Samah', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'ANGAM', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'anaml.artist10@gmail.com', Role: 'Artist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'رغد', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'البندري', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'سلمي', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'رولا', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'رحمة', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'شروق', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'الاء', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'روز', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'روضة', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'رغدالعمري', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'لانا', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'بسمة', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'العنود', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'رنا', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'روان', Role: 'Branch Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'سعادة العملاء', Role: 'Customer Service', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'امل احمد', Role: 'Sales Officer', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' },
      { Name: 'Raed', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Esraa Receiptionist', Role: 'Receiptionist', Password: '', Cards: 'ConnectionStatus,StatsOverview' },
      { Name: 'DR:ahmed', Role: 'Admin', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators' },
      { Name: 'Gehan', Role: 'Artist Manager', Password: '', Cards: 'ConnectionStatus,StatsOverview,RevenueChart' }
    ];
  }
}

// Helper function to parse CSV line with proper quote handling
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Helper function to clean card string (remove quotes and extra spaces)
function cleanCardString(cards: string): string {
  if (!cards) return '';
  
  return cards
    .replace(/"/g, '') // Remove quotes
    .split(',')
    .map(card => card.trim())
    .filter(card => card.length > 0)
    .join(',');
}

// Helper function to get default cards based on role
function getDefaultCardsForRole(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'ConnectionStatus,StatsOverview,RevenueChart,PerformanceIndicators';
    case 'branch manager':
      return 'ConnectionStatus,StatsOverview,RevenueChart';
    case 'sales officer':
      return 'ConnectionStatus,StatsOverview,RevenueChart';
    case 'artist manager':
      return 'ConnectionStatus,StatsOverview,RevenueChart';
    case 'receiptionist':
    case 'customer service':
    case 'artist':
      return 'ConnectionStatus,StatsOverview';
    default:
      return 'ConnectionStatus,StatsOverview';
  }
} 