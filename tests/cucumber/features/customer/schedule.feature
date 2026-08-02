@customer @schedule @sanity @regression
Feature: Customer - Schedule
  As a customer
  I want to view my weekly schedule
  So that I know when my classes are

  Background:
    Given I am logged in as customer
    And I am on the customer schedule page

  @sanity
  Scenario: Schedule grid is displayed
    Then the schedule navigation label is visible

  @regression
  Scenario: Navigate to next week
    When I navigate to the next week
    Then the schedule navigation label is visible

  @regression
  Scenario: Navigate back to today
    When I navigate to the next week
    And I click the today button
    Then the schedule navigation label is visible
