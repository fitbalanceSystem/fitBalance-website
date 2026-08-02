@admin @weekly-calendar @sanity @regression
Feature: Admin - Weekly Calendar
  As an admin
  I want to manage the weekly class schedule
  So that I can track sessions and attendance

  Background:
    Given I am logged in as admin
    And I am on the weekly calendar page

  @sanity
  Scenario: Weekly calendar loads with week range
    Then the week range label is displayed

  @regression
  Scenario: Navigate to next week
    When I navigate the calendar to the next week
    Then the week range label is displayed

  @regression
  Scenario: Navigate to previous week
    When I navigate the calendar to the previous week
    Then the week range label is displayed
