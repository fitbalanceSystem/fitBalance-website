@admin @reports @sanity @regression
Feature: Admin - Reports
  As an admin
  I want to view various reports
  So that I can make data-driven decisions

  Background:
    Given I am logged in as admin
    And I am on the admin reports page

  @sanity
  Scenario: Status report is shown by default
    Then the status report section is active

  @regression
  Scenario: Switch to debt report tab
    When I switch to the "debt" report tab
    Then the debt report section is active

  @regression
  Scenario: Switch to inventory report tab
    When I switch to the "inventory" report tab
    Then the inventory report section is active
