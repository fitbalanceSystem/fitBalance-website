@employee @profile @sanity @regression
Feature: Employee - Profile
  As an employee
  I want to view my profile
  So that I can see my details and classes

  Background:
    Given I am logged in as employee
    And I am on the employee profile page

  @sanity
  Scenario: Employee profile loads with name
    Then the employee name is displayed

  @regression
  Scenario: Employee details are populated
    Then the employee profile details are not empty
