@admin @automations @sanity @regression
Feature: Admin - Automations
  As an admin
  I want to manage automated processes
  So that recurring tasks run without manual intervention

  Background:
    Given I am logged in as admin
    And I am on the automations page

  @sanity
  Scenario: Salary logs table is loaded
    Then the salary logs table is displayed

  @regression
  Scenario: Run absence check automation
    When I run the absence check automation
    Then the absence results section is visible
