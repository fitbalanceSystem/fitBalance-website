@admin @inquiries @sanity @regression
Feature: Admin - Inquiries Management
  As an admin
  I want to manage incoming inquiries
  So that I can follow up with potential members

  Background:
    Given I am logged in as admin
    And I am on the admin inquiries page

  @sanity
  Scenario: Inquiries KPIs are visible
    Then the inquiries KPI values are displayed

  @regression
  Scenario: Search inquiries
    When I search inquiries for "מיכל"
    Then the inquiries count badge is visible

  @regression
  Scenario: Open inquiry detail
    When I open the first inquiry
    Then the inquiry view modal is open
