import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WhoisReport, WhoisReportCard } from './WhoisReport';
import { RiskLevel } from '../types/whois';
import { mockWhoisReport } from '../test/setup';

const mockRiskAssessment = {
  level: RiskLevel.MEDIUM,
  score: 45,
  factors: [
    'Domain created recently (less than 90 days)',
    'Privacy protection service in use'
  ],
  recommendations: [
    'Standard verification procedures recommended',
    'Verify company credentials through alternative channels'
  ]
};

describe('WhoisReport', () => {
  const defaultProps = {
    report: mockWhoisReport,
  };

  describe('Basic Rendering', () => {
    it('renders domain information in header', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.getByText('WHOIS Report')).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.domain)).toBeInTheDocument();
    });

    it('renders New Lookup button when onNewLookup is provided', () => {
      const mockOnNewLookup = vi.fn();
      render(<WhoisReport {...defaultProps} onNewLookup={mockOnNewLookup} />);
      
      expect(screen.getByRole('button', { name: /new lookup/i })).toBeInTheDocument();
    });

    it('does not render New Lookup button when onNewLookup is not provided', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.queryByRole('button', { name: /new lookup/i })).not.toBeInTheDocument();
    });
  });

  describe('Risk Assessment Section', () => {
    it('renders risk assessment when provided', () => {
      render(<WhoisReport {...defaultProps} riskAssessment={mockRiskAssessment} />);
      
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText(/medium risk/i)).toBeInTheDocument();
      expect(screen.getByText('Risk Score: 45/100')).toBeInTheDocument();
    });

    it('does not render risk assessment section when not provided', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.queryByText('Risk Assessment')).not.toBeInTheDocument();
    });

    it('renders risk factors when present', () => {
      render(<WhoisReport {...defaultProps} riskAssessment={mockRiskAssessment} />);
      
      expect(screen.getByText('Risk Factors')).toBeInTheDocument();
      expect(screen.getByText('Domain created recently (less than 90 days)')).toBeInTheDocument();
      expect(screen.getByText('Privacy protection service in use')).toBeInTheDocument();
    });

    it('renders recommendations when present', () => {
      render(<WhoisReport {...defaultProps} riskAssessment={mockRiskAssessment} />);
      
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Standard verification procedures recommended')).toBeInTheDocument();
      expect(screen.getByText('Verify company credentials through alternative channels')).toBeInTheDocument();
    });

    it('applies correct styling for different risk levels', () => {
      const lowRisk = { ...mockRiskAssessment, level: RiskLevel.LOW };
      const { rerender } = render(<WhoisReport {...defaultProps} riskAssessment={lowRisk} />);
      
      let riskContainer = screen.getByText(/low risk/i).parentElement;
      expect(riskContainer).toHaveClass('bg-success-100', 'text-success-800');

      const highRisk = { ...mockRiskAssessment, level: RiskLevel.HIGH };
      rerender(<WhoisReport {...defaultProps} riskAssessment={highRisk} />);
      
      riskContainer = screen.getByText(/high risk/i).parentElement;
      expect(riskContainer).toHaveClass('bg-error-100', 'text-error-800');

      const criticalRisk = { ...mockRiskAssessment, level: RiskLevel.CRITICAL };
      rerender(<WhoisReport {...defaultProps} riskAssessment={criticalRisk} />);
      
      riskContainer = screen.getByText(/critical risk/i).parentElement;
      expect(riskContainer).toHaveClass('bg-red-100', 'text-red-900');
    });
  });

  describe('Registration Information Section', () => {
    it('renders all registration details', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.getByText('Registration Information')).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.domain)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.registration.registrar!)).toBeInTheDocument();
      expect(screen.getByText('January 1, 2020')).toBeInTheDocument(); // Created date
      expect(screen.getByText('January 1, 2025')).toBeInTheDocument(); // Expiration date
      expect(screen.getByText(mockWhoisReport.registration.registrarWhoisServer!)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.technical.status!)).toBeInTheDocument();
    });

    it('shows expiration countdown', () => {
      render(<WhoisReport {...defaultProps} />);
      
      // Should show days until expiration (this will depend on current date)
      expect(screen.getByText(/expires in \d+ days/)).toBeInTheDocument();
    });

    it('handles missing registration data gracefully', () => {
      const reportWithMissingData = {
        ...mockWhoisReport,
        registration: {
          ...mockWhoisReport.registration,
          registrar: undefined,
          registrarWhoisServer: undefined,
        },
        technical: {
          ...mockWhoisReport.technical,
          status: undefined,
        }
      };

      render(<WhoisReport report={reportWithMissingData} />);
      
      expect(screen.getAllByText('Not available')).toHaveLength(3);
    });
  });

  describe('Contact Information Section', () => {
    it('renders all contact sections', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.getByText('Contact Information')).toBeInTheDocument();
      
      // Registrant section
      expect(screen.getByText('Registrant')).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.registrant.name!)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.registrant.organization!)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.registrant.email!)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.registrant.country!)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.registrant.phone!)).toBeInTheDocument();
      
      // Administrative section
      expect(screen.getByText('Administrative')).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.admin.name!)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.admin.email!)).toBeInTheDocument();
      
      // Technical section
      expect(screen.getByText('Technical')).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.tech.name!)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.tech.email!)).toBeInTheDocument();
    });

    it('handles missing contact data gracefully', () => {
      const reportWithMissingContacts = {
        ...mockWhoisReport,
        registrant: {},
        admin: {},
        tech: {}
      };

      render(<WhoisReport report={reportWithMissingContacts} />);
      
      // Should show "Not available" for missing fields
      expect(screen.getAllByText('Not available').length).toBeGreaterThan(5);
    });
  });

  describe('Technical Details Section', () => {
    it('renders technical information', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      expect(screen.getByText('Name Servers')).toBeInTheDocument();
      expect(screen.getByText('ns1.example.com')).toBeInTheDocument();
      expect(screen.getByText('ns2.example.com')).toBeInTheDocument();
      expect(screen.getByText('DNSSEC')).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.technical.dnssec!)).toBeInTheDocument();
    });

    it('handles missing name servers', () => {
      const reportWithoutNameServers = {
        ...mockWhoisReport,
        technical: {
          ...mockWhoisReport.technical,
          nameServers: undefined
        }
      };

      render(<WhoisReport report={reportWithoutNameServers} />);
      
      expect(screen.getByText('Not available')).toBeInTheDocument();
    });
  });

  describe('Risk Factors Section', () => {
    it('renders additional risk factors when present', () => {
      const reportWithRiskFactors = {
        ...mockWhoisReport,
        riskFactors: ['Suspicious domain pattern', 'Recent registration']
      };

      render(<WhoisReport report={reportWithRiskFactors} />);
      
      expect(screen.getByText('Additional Risk Factors')).toBeInTheDocument();
      expect(screen.getByText('Suspicious domain pattern')).toBeInTheDocument();
      expect(screen.getByText('Recent registration')).toBeInTheDocument();
    });

    it('does not render risk factors section when none present', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.queryByText('Additional Risk Factors')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Section', () => {
    it('renders lookup metadata', () => {
      render(<WhoisReport {...defaultProps} />);
      
      expect(screen.getByText(/lookup completed in 1500ms/i)).toBeInTheDocument();
      expect(screen.getByText(/source: whois-service/i)).toBeInTheDocument();
      expect(screen.getByText(/1\/1\/2024/)).toBeInTheDocument(); // Timestamp
    });
  });

  describe('User Interactions', () => {
    it('calls onNewLookup when New Lookup button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnNewLookup = vi.fn();
      
      render(<WhoisReport {...defaultProps} onNewLookup={mockOnNewLookup} />);
      
      const newLookupButton = screen.getByRole('button', { name: /new lookup/i });
      await user.click(newLookupButton);
      
      expect(mockOnNewLookup).toHaveBeenCalledOnce();
    });
  });
});

describe('WhoisReportCard', () => {
  const cardProps = {
    report: mockWhoisReport,
    riskAssessment: mockRiskAssessment
  };

  describe('Basic Rendering', () => {
    it('renders domain and basic info', () => {
      render(<WhoisReportCard {...cardProps} />);
      
      expect(screen.getByText(mockWhoisReport.domain)).toBeInTheDocument();
      expect(screen.getByText(mockWhoisReport.registrant.organization!)).toBeInTheDocument();
      expect(screen.getByText(/registered: 1\/1\/2020/i)).toBeInTheDocument();
    });

    it('renders risk assessment info', () => {
      render(<WhoisReportCard {...cardProps} />);
      
      expect(screen.getByText('MEDIUM')).toBeInTheDocument();
      expect(screen.getByText('45/100')).toBeInTheDocument();
    });

    it('handles missing organization gracefully', () => {
      const reportWithoutOrg = {
        ...mockWhoisReport,
        registrant: {
          ...mockWhoisReport.registrant,
          organization: undefined
        }
      };

      render(
        <WhoisReportCard 
          report={reportWithoutOrg} 
          riskAssessment={mockRiskAssessment} 
        />
      );
      
      expect(screen.getByText(mockWhoisReport.registrant.name!)).toBeInTheDocument();
    });

    it('handles missing registrant data', () => {
      const reportWithoutRegistrant = {
        ...mockWhoisReport,
        registrant: {}
      };

      render(
        <WhoisReportCard 
          report={reportWithoutRegistrant} 
          riskAssessment={mockRiskAssessment} 
        />
      );
      
      expect(screen.getByText('Unknown organization')).toBeInTheDocument();
    });

    it('handles missing registration date', () => {
      const reportWithoutDate = {
        ...mockWhoisReport,
        registration: {
          ...mockWhoisReport.registration,
          createdDate: undefined
        }
      };

      render(
        <WhoisReportCard 
          report={reportWithoutDate} 
          riskAssessment={mockRiskAssessment} 
        />
      );
      
      expect(screen.getByText(/registered: unknown/i)).toBeInTheDocument();
    });
  });

  describe('Risk Level Colors', () => {
    it('applies correct color for low risk', () => {
      const lowRisk = { ...mockRiskAssessment, level: RiskLevel.LOW };
      render(<WhoisReportCard {...cardProps} riskAssessment={lowRisk} />);
      
      const riskText = screen.getByText('LOW');
      expect(riskText).toHaveClass('text-success-600');
    });

    it('applies correct color for high risk', () => {
      const highRisk = { ...mockRiskAssessment, level: RiskLevel.HIGH };
      render(<WhoisReportCard {...cardProps} riskAssessment={highRisk} />);
      
      const riskText = screen.getByText('HIGH');
      expect(riskText).toHaveClass('text-error-600');
    });

    it('applies correct color for critical risk', () => {
      const criticalRisk = { ...mockRiskAssessment, level: RiskLevel.CRITICAL };
      render(<WhoisReportCard {...cardProps} riskAssessment={criticalRisk} />);
      
      const riskText = screen.getByText('CRITICAL');
      expect(riskText).toHaveClass('text-red-600');
    });
  });

  describe('User Interactions', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClick = vi.fn();
      
      render(<WhoisReportCard {...cardProps} onClick={mockOnClick} />);
      
      const card = screen.getByText(mockWhoisReport.domain).closest('div');
      expect(card).toHaveClass('cursor-pointer');
      
      await user.click(card!);
      expect(mockOnClick).toHaveBeenCalledOnce();
    });

    it('does not have cursor pointer when onClick is not provided', () => {
      render(<WhoisReportCard {...cardProps} />);
      
      const card = screen.getByText(mockWhoisReport.domain).closest('div');
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });
});