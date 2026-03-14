import * as XLSX from 'xlsx';

export interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  data: any[];
  headers?: string[];
  summaryData?: { [key: string]: any };
}

export const generateFilename = (
  reportType: string,
  eventName: string = 'AllEvents',
  startDate?: string,
  endDate?: string
): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const dateRange = startDate && endDate 
    ? `${startDate}_${endDate}` 
    : startDate 
    ? `${startDate}` 
    : 'AllTime';
  
  return `${reportType}_${eventName}_${dateRange}_${timestamp}.xlsx`;
};

export const exportToExcel = (options: ExcelExportOptions): void => {
  const { filename, sheetName, data, headers, summaryData } = options;
  
  // Create a new workbook
  const workbook = XLSX.utils.book_new();
  
  // Create summary sheet if summary data is provided
  if (summaryData) {
    const summarySheet = createSummarySheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  }
  
  // Create main data sheet
  const worksheet = headers 
    ? XLSX.utils.json_to_sheet(data, { header: headers })
    : XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const columnWidths = getColumnWidths(data, headers);
  worksheet['!cols'] = columnWidths;
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Write the file
  XLSX.writeFile(workbook, filename);
};

const createSummarySheet = (summaryData: { [key: string]: any }) => {
  const summaryArray = Object.entries(summaryData).map(([key, value]) => {
    // Format currency values properly
    if (typeof value === 'number' && (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('price'))) {
      return {
        Metric: key,
        Value: value // Keep as number for Excel formatting
      };
    }
    return {
      Metric: key,
      Value: value
    };
  });
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryArray);
  
  // Format currency cells in summary sheet
  const range = XLSX.utils.decode_range(summarySheet['!ref'] || 'A1');
  for (let row = 1; row <= range.e.r; row++) {
    const valueCell = XLSX.utils.encode_cell({ r: row, c: 1 }); // Value is column B (index 1)
    if (summarySheet[valueCell] && typeof summarySheet[valueCell].v === 'number') {
      const metricCell = XLSX.utils.encode_cell({ r: row, c: 0 }); // Metric is column A (index 0)
      const metricValue = summarySheet[metricCell]?.v || '';
      if (typeof metricValue === 'string' && (metricValue.toLowerCase().includes('revenue') || metricValue.toLowerCase().includes('price'))) {
        summarySheet[valueCell].z = '₹#,##0.00'; // Indian Rupee format
      }
    }
  }
  
  return summarySheet;
};

const getColumnWidths = (data: any[], headers?: string[]) => {
  if (!data.length) return [];
  
  const keys = headers || Object.keys(data[0]);
  return keys.map(key => {
    // Calculate the maximum content length for this column
    const maxContentLength = Math.max(
      key.length, // Header length
      ...data.map(row => {
        const value = row[key];
        if (value === null || value === undefined) return 3; // For 'N/A' or '-'
        
        // Special handling for price/currency columns
        if (key.toLowerCase().includes('price') || key.toLowerCase().includes('revenue')) {
          // Format as currency to get actual display length
          const numValue = typeof value === 'number' ? value : parseFloat(value || '0');
          return `₹${numValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.length;
        }
        
        return String(value).length;
      })
    );
    
    // Set minimum and maximum widths
    const minWidth = 8;
    const maxWidth = 50;
    
    // Add some padding and ensure reasonable bounds
    const calculatedWidth = Math.min(Math.max(maxContentLength + 3, minWidth), maxWidth);
    
    return { width: calculatedWidth };
  });
};

// Specific export functions for different report types
export const exportTicketReport = (
  tickets: any[],
  entryTypeCounts: any[],
  totalTickets: number,
  filters: {
    eventName?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  console.log('Exporting ticket report with data:', {
    ticketCount: tickets.length,
    totalTickets,
    entryTypeCounts,
    filters
  });
  
  if (tickets.length === 0) {
    console.warn('No tickets to export');
    return;
  }
  
  const filename = generateFilename(
    'TicketReport',
    filters.eventName || 'AllEvents',
    filters.startDate,
    filters.endDate
  );
  
  // Transform ticket data with exact headers as specified
  const ticketData = tickets.map(ticket => {
    const priceValue = parseFloat(ticket.price || '0');
    return {
      'Ticket ID': ticket.ticket_id || 'N/A',
      'Event': ticket.event_name || 'N/A',
      'Sub Event': ticket.sub_event_name || '-',
      'Entry Type': ticket.entry_type_name || 'N/A',
      'Staff': ticket.staff_username || 'N/A',
      'Price': priceValue, // Keep as number for Excel
      'Date': ticket.created_at ? new Date(ticket.created_at).toLocaleString() : 'N/A'
    };
  });
  
  console.log('Transformed ticket data sample:', ticketData.slice(0, 2));
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create detailed tickets sheet FIRST (this will be the main sheet)
  const headers = ['Ticket ID', 'Event', 'Sub Event', 'Entry Type', 'Staff', 'Price', 'Date'];
  const ticketSheet = XLSX.utils.json_to_sheet(ticketData, { header: headers });
  
  // Set column widths BEFORE formatting
  const columnWidths = [
    { width: 15 }, // Ticket ID
    { width: 25 }, // Event
    { width: 20 }, // Sub Event
    { width: 15 }, // Entry Type
    { width: 15 }, // Staff
    { width: 12 }, // Price
    { width: 20 }  // Date
  ];
  ticketSheet['!cols'] = columnWidths;
  
  // Format the Price column as currency
  if (ticketSheet['!ref']) {
    const range = XLSX.utils.decode_range(ticketSheet['!ref']);
    for (let row = 1; row <= range.e.r; row++) {
      const priceCell = XLSX.utils.encode_cell({ r: row, c: 5 }); // Price is column F (index 5)
      if (ticketSheet[priceCell] && typeof ticketSheet[priceCell].v === 'number') {
        ticketSheet[priceCell].z = '"₹"#,##0.00'; // Indian Rupee format with proper escaping
        ticketSheet[priceCell].t = 'n'; // Ensure it's treated as number
      }
    }
  }
  
  // Add the main ticket details sheet first
  XLSX.utils.book_append_sheet(workbook, ticketSheet, 'Ticket Details');
  
  // Create summary data
  const summaryData = {
    'Total Tickets': totalTickets,
    'Report Generated': new Date().toLocaleString(),
    'Event Filter': filters.eventName || 'All Events',
    'Date Range': filters.startDate && filters.endDate 
      ? `${filters.startDate} to ${filters.endDate}` 
      : filters.startDate 
      ? `From ${filters.startDate}` 
      : filters.endDate 
      ? `Until ${filters.endDate}` 
      : 'All Time',
    'Filters Applied': [
      filters.eventName ? `Event: ${filters.eventName}` : 'Event: All Events',
      filters.startDate ? `Start Date: ${filters.startDate}` : null,
      filters.endDate ? `End Date: ${filters.endDate}` : null
    ].filter(Boolean).join(', ')
  };
  
  // Add entry type breakdown to summary
  entryTypeCounts.forEach(entry => {
    const percentage = totalTickets > 0 ? ((entry.count / totalTickets) * 100).toFixed(1) : '0';
    summaryData[`${entry.entry_type_name} Count`] = `${entry.count} (${percentage}%)`;
  });
  
  // Create summary sheet
  const summarySheet = createSummarySheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Create entry type breakdown sheet if data exists
  if (entryTypeCounts.length > 0) {
    const entryTypeData = entryTypeCounts.map(entry => {
      const percentage = totalTickets > 0 ? ((entry.count / totalTickets) * 100).toFixed(1) : '0';
      return {
        'Entry Type': entry.entry_type_name,
        'Count': entry.count,
        'Percentage': `${percentage}%`
      };
    });
    
    const entryTypeSheet = XLSX.utils.json_to_sheet(entryTypeData);
    // Set column widths for entry type sheet
    entryTypeSheet['!cols'] = [
      { width: 20 }, // Entry Type
      { width: 10 }, // Count
      { width: 12 }  // Percentage
    ];
    XLSX.utils.book_append_sheet(workbook, entryTypeSheet, 'Entry Type Breakdown');
  }
  
  // Set the first sheet (Ticket Details) as active
  workbook.Workbook = workbook.Workbook || {};
  workbook.Workbook.Views = [{ activeTab: 0 }];
  
  console.log('Writing Excel file:', filename);
  console.log('Workbook sheets:', workbook.SheetNames);
  
  // Write the file
  XLSX.writeFile(workbook, filename);
  
  console.log('Excel export completed successfully');
};

export const exportRevenueReport = (
  revenueData: any,
  filters: {
    eventName?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  console.log('Exporting revenue report with data:', revenueData);
  
  if (!revenueData || !revenueData.revenue_by_event || revenueData.revenue_by_event.length === 0) {
    console.warn('No revenue data to export');
    return;
  }
  
  const filename = generateFilename(
    'RevenueReport',
    filters.eventName || 'AllEvents',
    filters.startDate,
    filters.endDate
  );
  
  // Transform revenue data with proper headers
  const revenueByEventData = (revenueData.revenue_by_event || []).map((event: any) => ({
    'Event Name': event.event__name,
    'Event Code': event.event__code,
    'Tickets Sold': event.ticket_count,
    'Total Revenue': parseFloat(event.total_revenue || '0')
  }));
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create detailed revenue sheet FIRST (main sheet)
  const headers = ['Event Name', 'Event Code', 'Tickets Sold', 'Total Revenue'];
  const revenueSheet = XLSX.utils.json_to_sheet(revenueByEventData, { header: headers });
  
  // Set column widths BEFORE formatting
  const columnWidths = [
    { width: 30 }, // Event Name
    { width: 15 }, // Event Code
    { width: 12 }, // Tickets Sold
    { width: 15 }  // Total Revenue
  ];
  revenueSheet['!cols'] = columnWidths;
  
  // Format the Total Revenue column as currency
  if (revenueSheet['!ref']) {
    const range = XLSX.utils.decode_range(revenueSheet['!ref']);
    for (let row = 1; row <= range.e.r; row++) {
      const revenueCell = XLSX.utils.encode_cell({ r: row, c: 3 }); // Total Revenue is column D (index 3)
      if (revenueSheet[revenueCell] && typeof revenueSheet[revenueCell].v === 'number') {
        revenueSheet[revenueCell].z = '"₹"#,##0.00';
        revenueSheet[revenueCell].t = 'n';
      }
    }
  }
  
  // Add the main revenue details sheet first
  XLSX.utils.book_append_sheet(workbook, revenueSheet, 'Revenue Details');
  
  // Create summary data
  const summaryData = {
    'Total Revenue': parseFloat(revenueData.total_revenue || '0'),
    'Total Events': revenueData.revenue_by_event?.length || 0,
    'Report Generated': new Date().toLocaleString(),
    'Event Filter': filters.eventName || 'All Events',
    'Date Range': filters.startDate && filters.endDate 
      ? `${filters.startDate} to ${filters.endDate}` 
      : filters.startDate 
      ? `From ${filters.startDate}` 
      : filters.endDate 
      ? `Until ${filters.endDate}` 
      : 'All Time',
    'Filters Applied': [
      filters.eventName ? `Event: ${filters.eventName}` : 'Event: All Events',
      filters.startDate ? `Start Date: ${filters.startDate}` : null,
      filters.endDate ? `End Date: ${filters.endDate}` : null
    ].filter(Boolean).join(', ')
  };
  
  // Create summary sheet
  const summarySheet = createSummarySheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Set the first sheet (Revenue Details) as active
  workbook.Workbook = workbook.Workbook || {};
  workbook.Workbook.Views = [{ activeTab: 0 }];
  
  console.log('Writing Excel file:', filename);
  
  // Write the file
  XLSX.writeFile(workbook, filename);
  
  console.log('Revenue export completed successfully');
};

export const exportStaffReport = (
  staffSummary: any[],
  filters: {
    staffName?: string;
  }
) => {
  console.log('Exporting staff report with data:', staffSummary);
  
  if (!staffSummary || staffSummary.length === 0) {
    console.warn('No staff data to export');
    return;
  }
  
  const filename = generateFilename(
    'StaffReport',
    filters.staffName || 'AllStaff'
  );
  
  const totalTickets = staffSummary.reduce((sum, s) => sum + s.tickets_generated, 0);
  const totalRevenue = staffSummary.reduce((sum, s) => sum + parseFloat(s.total_revenue), 0);
  
  // Transform staff data with proper headers
  const staffData = staffSummary.map(staff => ({
    'Staff Name': staff.username,
    'Staff Code': staff.staff_code,
    'Role': staff.role,
    'Range Start': staff.range_start,
    'Range End': staff.range_end,
    'Current Counter': staff.current_counter,
    'Tickets Generated': staff.tickets_generated,
    'Remaining Tickets': staff.remaining_tickets,
    'Total Revenue': parseFloat(staff.total_revenue || '0')
  }));
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Create detailed staff sheet FIRST (main sheet)
  const headers = ['Staff Name', 'Staff Code', 'Role', 'Range Start', 'Range End', 'Current Counter', 'Tickets Generated', 'Remaining Tickets', 'Total Revenue'];
  const staffSheet = XLSX.utils.json_to_sheet(staffData, { header: headers });
  
  // Set column widths BEFORE formatting
  const columnWidths = [
    { width: 20 }, // Staff Name
    { width: 12 }, // Staff Code
    { width: 10 }, // Role
    { width: 12 }, // Range Start
    { width: 12 }, // Range End
    { width: 15 }, // Current Counter
    { width: 16 }, // Tickets Generated
    { width: 16 }, // Remaining Tickets
    { width: 15 }  // Total Revenue
  ];
  staffSheet['!cols'] = columnWidths;
  
  // Format the Total Revenue column as currency
  if (staffSheet['!ref']) {
    const range = XLSX.utils.decode_range(staffSheet['!ref']);
    for (let row = 1; row <= range.e.r; row++) {
      const revenueCell = XLSX.utils.encode_cell({ r: row, c: 8 }); // Total Revenue is column I (index 8)
      if (staffSheet[revenueCell] && typeof staffSheet[revenueCell].v === 'number') {
        staffSheet[revenueCell].z = '"₹"#,##0.00';
        staffSheet[revenueCell].t = 'n';
      }
    }
  }
  
  // Add the main staff performance sheet first
  XLSX.utils.book_append_sheet(workbook, staffSheet, 'Staff Performance');
  
  // Create summary data
  const summaryData = {
    'Total Staff': staffSummary.length,
    'Total Tickets Generated': totalTickets,
    'Total Revenue': totalRevenue,
    'Report Generated': new Date().toLocaleString(),
    'Staff Filter': filters.staffName || 'All Staff'
  };
  
  // Create summary sheet
  const summarySheet = createSummarySheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Set the first sheet (Staff Performance) as active
  workbook.Workbook = workbook.Workbook || {};
  workbook.Workbook.Views = [{ activeTab: 0 }];
  
  console.log('Writing Excel file:', filename);
  
  // Write the file
  XLSX.writeFile(workbook, filename);
  
  console.log('Staff export completed successfully');
};